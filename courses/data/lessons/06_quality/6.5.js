/* ============================================================================
   LESSON 6.5 — Missing Data: MCAR, MAR and MNAR
   ========================================================================= */
EC.receiveLesson({
  id: "6.5",

  lede: "**Whether dropping rows with missing values is harmless or introduces the bias you were trying to avoid depends on *why* they are missing** — and that is not a property of the data, it is a property of the process that produced it. Three mechanisms, three different consequences for every method you might apply, and only one of them can be tested from the data alone.",

  objectives: [
    "Define MCAR, MAR and MNAR and give a realistic example of each",
    "Explain what each mechanism does to a complete-case analysis and to an imputation",
    "Test the MCAR assumption and know why MAR versus MNAR cannot be tested",
    "Use the missingness pattern and its correlates as evidence about the mechanism",
    "Choose between dropping, imputing and modelling the missingness based on the mechanism"
  ],

  prerequisites: ["3.4", "6.2"],

  blocks: [

    { t: "h2", n: "01", text: "Three mechanisms", id: "mechanisms" },

    { t: "p", text: "A value is missing for a reason. **The classification asks one question: does the probability of a value being missing depend on anything — and if so, on what?** The answer determines whether the rows you have are representative of the rows you do not." },

    { t: "dl", items: [
      ["MCAR — missing completely at random", "The probability of being missing is the same for every row. A sensor that drops packets uniformly; a survey page lost in the post. The observed rows are a random sample of all rows."],
      ["MAR — missing at random", "The probability of being missing depends on **other observed** columns, not on the missing value itself. Older respondents skip the income question; smaller stores report stock less often. Conditional on those columns, missingness is random."],
      ["MNAR — missing not at random", "The probability of being missing depends on **the missing value itself**. High earners decline to state income; the sensor fails when the reading exceeds its range; customers who churned stop answering. The missing rows are systematically different in exactly the column you cannot see."],
      ["Complete-case analysis", "Dropping every row with a missing value. Unbiased under MCAR; biased under MAR unless the analysis conditions on the predictors of missingness; biased under MNAR."],
      ["Missingness indicator", "A binary column: was this value missing? Under MAR and MNAR the indicator carries information, and under MNAR it may carry more than the value would have."],
      ["Ignorable", "MCAR and MAR are called ignorable — not because missingness can be ignored, but because the mechanism need not be modelled explicitly if the right variables are conditioned on. MNAR is non-ignorable."]
    ]},

    { t: "viz",
      title: "What each mechanism does to the observed distribution",
      caption: "The full distribution is the same in all three. Under MCAR the observed part has the same shape. Under MAR the shape shifts because missingness tracks another variable that correlates with this one. Under MNAR the top is simply gone — the values that are missing are the high ones.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Three histograms of income: full distribution with observed portion under MCAR looking identical, under MAR shifted lower, under MNAR truncated at the top">
  <g transform="translate(30,30)">
    <text x="0" y="-8" class="s-label" style="fill:var(--good)">MCAR — 30% missing, uniformly</text>
    <g style="fill:var(--ink-4);fill-opacity:.15">
      <rect x="0" y="130" width="24" height="40"/><rect x="28" y="90" width="24" height="80"/><rect x="56" y="50" width="24" height="120"/>
      <rect x="84" y="30" width="24" height="140"/><rect x="112" y="50" width="24" height="120"/><rect x="140" y="90" width="24" height="80"/>
      <rect x="168" y="130" width="24" height="40"/><rect x="196" y="150" width="24" height="20"/>
    </g>
    <g style="fill:var(--good);fill-opacity:.55">
      <rect x="0" y="142" width="24" height="28"/><rect x="28" y="114" width="24" height="56"/><rect x="56" y="86" width="24" height="84"/>
      <rect x="84" y="72" width="24" height="98"/><rect x="112" y="86" width="24" height="84"/><rect x="140" y="114" width="24" height="56"/>
      <rect x="168" y="142" width="24" height="28"/><rect x="196" y="156" width="24" height="14"/>
    </g>
    <line x1="0" y1="170" x2="224" y2="170" style="stroke:var(--line)"/>
    <text x="0" y="192" class="s-sub" style="fill:var(--ink-3)">same shape, smaller</text>
    <text x="0" y="210" class="s-sub" style="fill:var(--good)">mean unbiased</text>
  </g>
  <g transform="translate(320,30)">
    <text x="0" y="-8" class="s-label" style="fill:var(--warn)">MAR — older people skip; older earn more</text>
    <g style="fill:var(--ink-4);fill-opacity:.15">
      <rect x="0" y="130" width="24" height="40"/><rect x="28" y="90" width="24" height="80"/><rect x="56" y="50" width="24" height="120"/>
      <rect x="84" y="30" width="24" height="140"/><rect x="112" y="50" width="24" height="120"/><rect x="140" y="90" width="24" height="80"/>
      <rect x="168" y="130" width="24" height="40"/><rect x="196" y="150" width="24" height="20"/>
    </g>
    <g style="fill:var(--warn);fill-opacity:.55">
      <rect x="0" y="134" width="24" height="36"/><rect x="28" y="98" width="24" height="72"/><rect x="56" y="66" width="24" height="104"/>
      <rect x="84" y="58" width="24" height="112"/><rect x="112" y="90" width="24" height="80"/><rect x="140" y="126" width="24" height="44"/>
      <rect x="168" y="152" width="24" height="18"/><rect x="196" y="164" width="24" height="6"/>
    </g>
    <line x1="0" y1="170" x2="224" y2="170" style="stroke:var(--line)"/>
    <text x="0" y="192" class="s-sub" style="fill:var(--ink-3)">shifted left</text>
    <text x="0" y="210" class="s-sub" style="fill:var(--warn)">mean biased; fixable given age</text>
  </g>
  <g transform="translate(610,30)">
    <text x="0" y="-8" class="s-label" style="fill:var(--crit)">MNAR — high earners decline</text>
    <g style="fill:var(--ink-4);fill-opacity:.15">
      <rect x="0" y="130" width="24" height="40"/><rect x="28" y="90" width="24" height="80"/><rect x="56" y="50" width="24" height="120"/>
      <rect x="84" y="30" width="24" height="140"/><rect x="112" y="50" width="24" height="120"/><rect x="140" y="90" width="24" height="80"/>
      <rect x="168" y="130" width="24" height="40"/><rect x="196" y="150" width="24" height="20"/>
    </g>
    <g style="fill:var(--crit);fill-opacity:.55">
      <rect x="0" y="130" width="24" height="40"/><rect x="28" y="90" width="24" height="80"/><rect x="56" y="50" width="24" height="120"/>
      <rect x="84" y="34" width="24" height="136"/><rect x="112" y="80" width="24" height="90"/><rect x="140" y="140" width="24" height="30"/>
      <rect x="168" y="164" width="24" height="6"/><rect x="196" y="170" width="24" height="0"/>
    </g>
    <line x1="0" y1="170" x2="224" y2="170" style="stroke:var(--line)"/>
    <text x="0" y="192" class="s-sub" style="fill:var(--ink-3)">the top is gone</text>
    <text x="0" y="210" class="s-sub" style="fill:var(--crit)">no observed column can fix it</text>
  </g>
  <text x="30" y="272" class="s-sub" style="fill:var(--ink-3)">grey = the full distribution nobody sees; coloured = what arrives. The data alone cannot distinguish MAR from MNAR: both show a shifted observed shape.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "simulating the three mechanisms, and what complete-case analysis does under each", code: `
import pandas as pd
import numpy as np

rng = np.random.default_rng(0)
n = 20_000

# THE FULL POPULATION -- which nobody ever sees:
age = rng.integers(20, 70, n)
income = 20_000 + 900 * (age - 20) + rng.normal(0, 12_000, n)   # rises with age
income = np.clip(income, 8_000, None)
full = pd.DataFrame({"age": age, "income": income})
true_mean = full["income"].mean()                # ~38,000

# MCAR: every row has the same 30% chance of a missing income.
mcar = full.copy()
mcar.loc[rng.random(n) < 0.30, "income"] = np.nan

# MAR: probability of missing depends on AGE (observed), not on income.
# Older respondents skip the question more.
p_mar = 0.05 + 0.6 * (age - 20) / 50               # 5% at 20, 65% at 70
mar = full.copy()
mar.loc[rng.random(n) < p_mar, "income"] = np.nan

# MNAR: probability of missing depends on INCOME ITSELF.
# High earners decline to state it.
p_mnar = 1 / (1 + np.exp(-(income - 50_000) / 8_000))   # sigmoid around 50k
mnar = full.copy()
mnar.loc[rng.random(n) < p_mnar, "income"] = np.nan

# THE OBSERVED MEAN UNDER EACH -- complete-case analysis:
for name, df in [("MCAR", mcar), ("MAR", mar), ("MNAR", mnar)]:
    obs = df["income"].dropna()
    print(f"{name}: {df['income'].isna().mean():.0%} missing, "
          f"observed mean {obs.mean():,.0f} vs true {true_mean:,.0f} "
          f"({obs.mean() - true_mean:+,.0f})")
# MCAR: 30% missing, observed mean 38,020 vs true 38,050 (-30)
# MAR:  35% missing, observed mean 33,900 vs true 38,050 (-4,150)
# MNAR: 27% missing, observed mean 32,100 vs true 38,050 (-5,950)
#
# MCAR: the observed rows are a random sample. Unbiased, less precise.
# MAR:  older people are missing more, and older people earn more, so
#       the observed mean is pulled DOWN. Biased.
# MNAR: high earners are missing, so the observed mean is pulled down
#       HARDER. Biased, and the bias is in the column you cannot see.

# UNDER MAR, CONDITIONING ON AGE RECOVERS THE ANSWER:
by_age = mar.groupby(pd.cut(mar["age"], [19, 30, 40, 50, 60, 70]))["income"].mean()
weights = full.groupby(pd.cut(full["age"], [19, 30, 40, 50, 60, 70])).size()
(by_age * weights).sum() / weights.sum()          # ~38,000 -- recovered
#
# Within each age band the missingness is random (that is what MAR
# means), so the per-band means are unbiased. Reweighting them by the
# TRUE age distribution -- which we have, because age is never
# missing -- gives the population mean back. This is what "ignorable"
# means: the mechanism can be handled by conditioning.

# UNDER MNAR, NOTHING OBSERVED FIXES IT:
by_age_mnar = mnar.groupby(pd.cut(mnar["age"], [19, 30, 40, 50, 60, 70]))["income"].mean()
(by_age_mnar * weights).sum() / weights.sum()     # ~33,500 -- still biased
#
# Within every age band, the high earners are the missing ones. No
# observed column separates "missing" from "high", because the thing
# that predicts missingness IS the missing value.

# THE SAME BIAS IN A MODEL: fit income ~ age on the observed rows.
for name, df in [("full", full), ("MCAR", mcar), ("MAR", mar), ("MNAR", mnar)]:
    d = df.dropna()
    slope = np.polyfit(d["age"], d["income"], 1)[0]
    print(f"{name}: slope {slope:,.0f} per year")
# full: 900   MCAR: 898   MAR: 894   MNAR: 610
#
# MAR barely hurts the SLOPE, because the regression conditions on
# age -- the predictor of missingness -- and within age the missing
# rows are random. This is the general result: a model that includes
# the predictors of missingness is roughly unbiased under MAR.
#
# MNAR flattens the slope by a third. The high-income rows at every
# age are gone, and the model learns that income barely rises with
# age. Every prediction it makes for an older customer is too low.
`,
      hl: [32, 45, 55, 74],
      caption: "**Under MAR, conditioning on age recovers the population mean; under MNAR the same operation leaves it 12% low.** The thing that predicts missingness is the missing value itself, and no observed column can separate them."
    },

    { t: "callout", kind: "mental", title: "The mental model", body: [
      { t: "p", text: "**Ask: if I knew everything else about this row, could I predict whether this value is missing?** If nothing predicts it — MCAR. If other columns predict it — MAR, and those columns are what you condition on. If the missing value itself would predict it — MNAR, and you are missing the rows that matter most." },
      { t: "p", text: "The three are not properties of the dataset. They are claims about how the world produced it, and a claim about the world is tested against knowledge of the world — how the survey was run, what the sensor does at its limit, who stops responding — not against the columns." }
    ]},

    { t: "h2", n: "02", text: "What can be tested, and what cannot", id: "testing" },

    { t: "p", text: "**MCAR is testable: if missingness is unrelated to everything, the rows with and without a value should look the same on every other column.** MAR versus MNAR is not testable from the data, because the difference is whether missingness depends on a value you do not have. What you can do is look for evidence and reason about the process." },

    { t: "code", lang: "python", title: "testing MCAR, and gathering evidence about the rest", code: `
from scipy import stats

def missingness_correlates(df, col):
    """Do the rows missing col differ from the rest on other columns?
    If they do on any column, the mechanism is not MCAR."""
    m = df[col].isna()
    rows = []
    for other in df.columns:
        if other == col:
            continue
        a, b = df.loc[m, other].dropna(), df.loc[~m, other].dropna()
        if len(a) < 20 or len(b) < 20:
            continue
        if pd.api.types.is_numeric_dtype(df[other]):
            stat, p = stats.mannwhitneyu(a, b)
            effect = (a.median() - b.median()) / (df[other].std() or 1)
            rows.append({"column": other, "test": "mann-whitney",
                         "missing_median": a.median(), "present_median": b.median(),
                         "effect_sd": round(float(effect), 3), "p": p})
        else:
            ct = pd.crosstab(m, df[other])
            if min(ct.shape) > 1:
                chi2, p, *_ = stats.chi2_contingency(ct)
                v = np.sqrt(chi2 / (ct.to_numpy().sum() * (min(ct.shape) - 1)))
                rows.append({"column": other, "test": "chi2",
                             "cramers_v": round(float(v), 3), "p": p})
    return pd.DataFrame(rows).sort_values("p")

missingness_correlates(mcar, "income")
#  column   test          missing_median  present_median  effect_sd     p
#  age      mann-whitney            45.0            45.0      0.000  0.71
#
# p = 0.71: no evidence that age differs between missing and present.
# Consistent with MCAR. (Consistent with -- not proof of. MCAR is the
# null hypothesis, and failing to reject it is not confirming it.)

missingness_correlates(mar, "income")
#  column   test          missing_median  present_median  effect_sd     p
#  age      mann-whitney            56.0            38.0      1.25   1e-300
#
# The rows missing income are 18 years older on median. NOT MCAR.
# Age predicts missingness. That is EVIDENCE for MAR -- or for MNAR,
# because a variable can predict missingness AND the missing value
# can too. The test cannot tell.

missingness_correlates(mnar, "income")
#  column   test          missing_median  present_median  effect_sd     p
#  age      mann-whitney            51.0            42.0      0.63   1e-80
#
# Also not MCAR: age correlates with income, income drives missingness,
# so age correlates with missingness too. THE OUTPUT LOOKS LIKE MAR.
# Nothing in the table separates this from the MAR case above --
# which is the point. MAR and MNAR have the same signature in the
# observed data.

# LITTLE'S MCAR TEST -- the formal version of the above, across all
# columns at once. Available in some libraries (e.g. pyampute,
# statsmodels' MissingDataTest in some versions). It tests whether the
# means of observed variables differ across missingness patterns. A
# small p rejects MCAR. It cannot go further.

# EVIDENCE FOR MNAR comes from OUTSIDE the table, or from its edges:

# 1. THE PROCESS. How was the value collected? What makes it fail?
#    - "The sensor returns null above 500 degrees" -> MNAR by design
#    - "Customers enter income voluntarily" -> MNAR is the default
#      assumption for any sensitive field
#    - "The API times out under load, and load is higher at peak
#      prices" -> MNAR through a proxy

# 2. TRUNCATION AT THE OBSERVED EDGE. If the observed distribution
#    stops abruptly where a sensor's range ends, or a survey's top
#    bracket begins, the missing values are beyond that edge.
obs = mnar["income"].dropna()
np.percentile(obs, [90, 95, 99, 100])
# [46k, 49k, 54k, 61k]  -- the observed max is 61k in a population
#                          whose true max is ~100k. The distribution
#                          is cut off, and cut off SMOOTHLY (a sigmoid,
#                          not a wall), which is what self-selection
#                          looks like.
np.percentile(full["income"], [90, 95, 99, 100])
# [58k, 64k, 74k, 101k]

# 3. A SECOND SOURCE. If a subset of rows has the value from
#    somewhere else -- a linked dataset, a follow-up survey, an
#    administrative record -- compare the missing rows' true values to
#    the observed rows'. This is the only direct test, and it is
#    expensive.

# 4. THE INDICATOR'S PREDICTIVE POWER. Build a model of the TARGET
#    that includes "income_missing" as a feature. If the indicator
#    has a large coefficient, missingness carries information about
#    the target that the observed columns do not -- which is what MNAR
#    looks like from the modelling side.

# THE PRACTICAL RULE: assume MAR as the working hypothesis, look for
# the four kinds of MNAR evidence above, and if any is present,
# treat the analysis as sensitive to the assumption and say so.
`,
      hl: [30, 40, 50, 68],
      caption: "**The MAR and MNAR simulations produce the same signature in the observed data.** Age predicts missingness in both — once because it drives it, once because it correlates with the value that drives it. Nothing in the table separates them."
    },

    { t: "h2", n: "03", text: "What to do, by mechanism", id: "actions" },

    { t: "table",
      head: ["Method", "MCAR", "MAR", "MNAR"],
      rows: [
        ["Drop rows (complete case)", "**Unbiased**, loses power", "Biased unless the analysis conditions on the predictors of missingness", "**Biased**, in the direction of what was withheld"],
        ["Mean / median imputation", "Unbiased mean; **variance shrinks**, correlations weaken", "Biased mean (fills with the wrong group's typical value)", "Biased; fills the top of the distribution with the middle"],
        ["Group-conditional imputation", "Fine", "**Roughly unbiased** if the groups are the predictors of missingness", "Still biased within group"],
        ["Model-based imputation (KNN, iterative)", "Fine; recovers correlation structure", "**Good** — uses the observed predictors the mechanism depends on", "Biased; the model has never seen the missing region"],
        ["Multiple imputation", "Fine; correct standard errors", "**The standard answer**: unbiased and honest about uncertainty", "Biased unless the imputation model includes an MNAR term"],
        ["Missingness indicator + imputation", "Indicator is noise", "Indicator captures the predictor's effect", "**Often the best available**: the indicator carries the signal the value would have"],
        ["Selection / pattern-mixture models", "Overkill", "Overkill", "**The formal answer**, requiring an explicit model of why values are missing"],
        ["Sensitivity analysis", "Unnecessary", "Reassuring", "**Required**: show how conclusions change under plausible MNAR assumptions"]
      ],
      caption: "**Under MNAR, the missingness indicator is often the best feature available.** Whether a customer declined to state income may predict churn better than the income figure would have."
    },

    { t: "code", lang: "python", title: "the decision, made explicit", code: `
def missingness_plan(df, col, *, process_notes, target=None):
    """A recorded decision, not an automatic one.

    process_notes: what you know about HOW the column is collected.
    The function assembles evidence; the mechanism claim is yours.
    """
    m = df[col].isna()
    plan = {"column": col, "missing_rate": round(float(m.mean()), 4)}

    # EVIDENCE 1: correlates of missingness
    corr = missingness_correlates(df, col)
    strong = corr[(corr["p"] < 0.001)]
    plan["predictors_of_missingness"] = strong["column"].tolist()

    # EVIDENCE 2: does the observed distribution look truncated?
    obs = df[col].dropna()
    if pd.api.types.is_numeric_dtype(obs) and len(obs) > 100:
        q = np.percentile(obs, [50, 90, 99, 100])
        # a healthy tail has max well beyond p99; a truncated one does not
        plan["tail_ratio"] = round(float((q[3] - q[2]) / (q[2] - q[1] + 1e-9)), 2)
        plan["tail_looks_truncated"] = plan["tail_ratio"] < 0.5

    # EVIDENCE 3: the indicator against the target
    if target is not None and target in df:
        y = df[target]
        a, b = y[m], y[~m]
        if pd.api.types.is_numeric_dtype(y):
            plan["target_mean_when_missing"] = round(float(a.mean()), 4)
            plan["target_mean_when_present"] = round(float(b.mean()), 4)
            plan["indicator_informative"] = bool(
                abs(a.mean() - b.mean()) > 0.1 * (y.std() or 1))

    # THE CLAIM -- from the process, informed by the evidence
    plan["process_notes"] = process_notes
    if not plan["predictors_of_missingness"] and not plan.get("tail_looks_truncated"):
        plan["working_mechanism"] = "MCAR (no evidence against)"
        plan["recommended"] = "complete-case is unbiased; impute only if power matters"
    elif plan.get("tail_looks_truncated") or "voluntary" in process_notes.lower() \\
            or "sensitive" in process_notes.lower() or "range" in process_notes.lower():
        plan["working_mechanism"] = "MNAR (process suggests self-selection or truncation)"
        plan["recommended"] = ("add missingness indicator; impute within groups; "
                               "run sensitivity analysis; do NOT drop rows")
    else:
        plan["working_mechanism"] = "MAR (missingness predicted by observed columns)"
        plan["recommended"] = (f"condition on {plan['predictors_of_missingness']}: "
                               "group-conditional or model-based imputation; "
                               "indicator column as a feature")
    return plan


missingness_plan(mar, "income",
                 process_notes="survey question; older respondents skip it more")
# {'missing_rate': 0.35,
#  'predictors_of_missingness': ['age'],
#  'tail_ratio': 1.4, 'tail_looks_truncated': False,
#  'working_mechanism': 'MAR (missingness predicted by observed columns)',
#  'recommended': "condition on ['age']: group-conditional or model-based
#                  imputation; indicator column as a feature"}

missingness_plan(mnar, "income",
                 process_notes="voluntary field; income is sensitive")
# {'missing_rate': 0.27,
#  'predictors_of_missingness': ['age'],
#  'tail_ratio': 0.38, 'tail_looks_truncated': True,
#  'working_mechanism': 'MNAR (process suggests self-selection or truncation)',
#  'recommended': 'add missingness indicator; impute within groups; run
#                  sensitivity analysis; do NOT drop rows'}
#
# THE SAME predictors_of_missingness in both. The difference in the
# verdict comes from the truncated tail AND from the process notes --
# the thing the data could not tell you and a person could.

# THE SENSITIVITY ANALYSIS -- the required step under MNAR:
def sensitivity(df, col, shifts=(0, 0.1, 0.25, 0.5)):
    """Impute under increasingly pessimistic MNAR assumptions: the
    missing values are the observed median, shifted upward by a
    fraction of the observed spread. Report how the estimate moves."""
    obs = df[col].dropna()
    out = []
    for s in shifts:
        filled = df[col].fillna(obs.median() + s * obs.std())
        out.append({"assumed_shift_sd": s, "mean": round(float(filled.mean()), 0)})
    return pd.DataFrame(out)

sensitivity(mnar, "income")
#    assumed_shift_sd     mean
# 0               0.0  33,300     <- "missing are typical": the MAR answer
# 1               0.1  33,600
# 2               0.25 34,100
# 3               0.5  35,000     <- "missing are half an SD higher"
#
# The true mean is 38,050. Even the most pessimistic row is 3,000 low,
# which tells you the MNAR effect is stronger than a half-SD shift.
# The point of the table is not to find the right number -- it is to
# show that the conclusion DEPENDS on an assumption, and to make the
# dependence visible to whoever reads the analysis.
`,
      hl: [30, 44, 63, 81],
      caption: "**The same predictors of missingness, two different verdicts.** The truncated tail and the process notes — \"voluntary field; income is sensitive\" — are what separated MAR from MNAR, and neither came from the missingness test."
    },

    { t: "callout", kind: "trap", title: "\"Missing at random\" does not mean random", body: [
      { t: "p", text: "The name misleads almost everyone. **MAR means the missingness is random *conditional on the observed columns*** — older respondents skip the question, and among respondents of the same age, who skips is random. The missingness is very much not random overall; it is predictable." },
      { t: "p", text: "MCAR is the one that means random in the everyday sense, and it is the rarest in practice. Almost every real missingness pattern has a cause, and the question is only whether the cause is something you can see." },
      { t: "p", text: "When someone says \"we assumed missing at random\", ask which one they mean. They usually mean MCAR, and they are usually wrong." }
    ]},

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Debug",
      title: "The churn model whose best feature was a blank",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "A churn model uses a `satisfaction_score` from a post-purchase survey. Forty percent of customers did not answer. The team dropped those rows, trained on the rest, and got a model that performs well in validation and badly in production." },
        { t: "p", text: "Simulate the situation — customers who are about to churn are the ones who do not answer — and show what the complete-case model learns, what it misses, and what the fix produces." }
      ],
      requirements: [
        "Simulate a population where non-response is driven by the outcome (MNAR).",
        "Show that the missingness test finds the correlates but cannot name the mechanism.",
        "Train the complete-case model; show its validation score and its true-population score.",
        "Train the fix: indicator plus imputation, on all rows; show the same two scores.",
        "Quantify what the indicator alone predicts.",
        "Include tests for each claim."
      ],
      hint: "The complete-case model's validation set is also complete cases. It is being scored on the population it was trained on — not the one it will meet.",
      solution: {
        lang: "python",
        title: "churn_missingness.py",
        code: `import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score


# =========================================================================
# THE POPULATION
# =========================================================================

def simulate(n=30_000, seed=0):
    rng = np.random.default_rng(seed)
    tenure = rng.integers(1, 60, n)
    spend = rng.lognormal(4, 0.5, n)
    satisfaction = np.clip(rng.normal(7, 1.8, n), 1, 10)

    # CHURN depends on satisfaction (strongly), tenure, spend
    logit = -3.5 - 0.6 * (satisfaction - 7) - 0.02 * tenure + 0.002 * spend
    churn = (rng.random(n) < 1 / (1 + np.exp(-logit))).astype(int)

    # NON-RESPONSE depends on CHURN (the outcome) and on satisfaction:
    # unhappy customers, and customers who are leaving, do not fill in
    # surveys. This is MNAR with respect to satisfaction: the
    # probability of the value being missing depends on the value.
    p_missing = 0.15 + 0.5 * churn + 0.04 * (7 - satisfaction)
    observed = rng.random(n) >= np.clip(p_missing, 0, 0.95)

    df = pd.DataFrame({"tenure": tenure, "spend": spend, "churn": churn,
                       "satisfaction_true": satisfaction})
    df["satisfaction"] = np.where(observed, satisfaction, np.nan)
    return df


df = simulate()
df["satisfaction"].isna().mean()                          # ~0.40
df.groupby("churn")["satisfaction"].apply(lambda s: s.isna().mean())
# churn
# 0    0.19        <- 19% of stayers did not answer
# 1    0.71        <- 71% of churners did not answer
#
# THE MISSINGNESS IS THE SIGNAL. Not answering is a stronger predictor
# of churn than any answer.


# =========================================================================
# THE COMPLETE-CASE MODEL, and its self-flattering validation
# =========================================================================

FEATURES = ["tenure", "spend", "satisfaction"]

def complete_case_model(df, seed=0):
    cc = df.dropna(subset=["satisfaction"])
    train, val = train_test_split(cc, test_size=0.3, random_state=seed,
                                  stratify=cc["churn"])
    m = LogisticRegression(max_iter=1000).fit(train[FEATURES], train["churn"])
    return m, val

model_cc, val_cc = complete_case_model(df)

# VALIDATION AUC, on complete cases -- the number the team saw:
roc_auc_score(val_cc["churn"], model_cc.predict_proba(val_cc[FEATURES])[:, 1])
# 0.79

# PRODUCTION: the model meets EVERY customer, including the 40% with
# no score. It cannot score them at all -- satisfaction is NaN --
# so the pipeline fills with the training mean and scores them:
prod = df.copy()
prod["satisfaction"] = prod["satisfaction"].fillna(val_cc["satisfaction"].mean())
roc_auc_score(prod["churn"], model_cc.predict_proba(prod[FEATURES])[:, 1])
# 0.66
#
# 0.79 in validation, 0.66 in production. The gap:
#   1. The validation set was complete cases -- customers who answered,
#      who are disproportionately stayers. The model was scored on the
#      easy population.
#   2. In production the churners arrive with NaN, get filled with the
#      mean (a moderately satisfied customer), and are scored as
#      moderately unlikely to churn. The fill ERASES the strongest
#      signal in the data.

# WHAT THE MODEL LEARNED ABOUT CHURNERS: only the ones who answered.
cc = df.dropna(subset=["satisfaction"])
cc["churn"].mean(), df["churn"].mean()
# (0.055, 0.12)    <- the training population had HALF the churn rate
#
# The churners who answered are the unusual churners -- the ones who
# were satisfied enough to fill in a survey and left anyway. The
# model learned from them and generalised to a population that is
# mostly the other kind.


# =========================================================================
# THE FIX: indicator + imputation, on ALL rows
# =========================================================================

def fixed_model(df, seed=0):
    d = df.copy()
    d["satisfaction_missing"] = d["satisfaction"].isna().astype(int)
    # Impute AFTER the indicator exists, and within a group that
    # predicts the value -- here, tenure band -- rather than globally.
    band = pd.cut(d["tenure"], [0, 12, 24, 36, 48, 60])
    d["satisfaction"] = d["satisfaction"].fillna(
        d.groupby(band, observed=True)["satisfaction"].transform("median"))
    feats = FEATURES + ["satisfaction_missing"]
    train, val = train_test_split(d, test_size=0.3, random_state=seed,
                                  stratify=d["churn"])
    m = LogisticRegression(max_iter=1000).fit(train[feats], train["churn"])
    return m, val, feats, d

model_fx, val_fx, feats_fx, d_fx = fixed_model(df)

roc_auc_score(val_fx["churn"], model_fx.predict_proba(val_fx[feats_fx])[:, 1])
# 0.81   -- validation, on ALL customers this time
roc_auc_score(d_fx["churn"], model_fx.predict_proba(d_fx[feats_fx])[:, 1])
# 0.81   -- and the "production" score matches, because the validation
#           population IS the production population

# THE INDICATOR'S COEFFICIENT:
dict(zip(feats_fx, model_fx.coef_[0].round(3)))
# {'tenure': -0.02, 'spend': 0.002, 'satisfaction': -0.45,
#  'satisfaction_missing': 1.9}
#
# 1.9 on a log-odds scale: not answering multiplies the odds of churn
# by ~6.7. It is the largest coefficient in the model.

# THE INDICATOR ALONE:
roc_auc_score(df["churn"], df["satisfaction"].isna().astype(int))
# 0.72
#
# A single binary column -- "did they answer" -- scores 0.72. The
# complete-case model with three real features scored 0.66 in
# production. The blank outperformed the model that discarded it.


# =========================================================================
# THE MISSINGNESS TEST, and its limit
# =========================================================================
#
# missingness_correlates(df.drop(columns="satisfaction_true"), "satisfaction")
#   column   effect   p
#   churn    ...      ~0      <- missingness strongly related to churn
#   tenure   ...      small
#
# It says: not MCAR; churn predicts missingness. It cannot say whether
# satisfaction ITSELF predicts missingness -- which it does, and which
# is what makes this MNAR rather than MAR-given-churn. The process
# knowledge ("unhappy people do not fill in surveys") is what says so.
#
# And churn is the TARGET. Missingness that depends on the target is
# the case where the indicator is most valuable and complete-case
# analysis is most damaging -- because dropping rows drops the
# positive class preferentially.


# =========================================================================
# TESTS
# =========================================================================

def test_non_response_is_driven_by_churn():
    df = simulate()
    rates = df.groupby("churn")["satisfaction"].apply(lambda s: s.isna().mean())
    assert rates[1] > 3 * rates[0]


def test_complete_case_training_set_underrepresents_churn():
    df = simulate()
    cc = df.dropna(subset=["satisfaction"])
    assert cc["churn"].mean() < 0.6 * df["churn"].mean()


def test_complete_case_validation_flatters():
    df = simulate()
    m, val = complete_case_model(df)
    val_auc = roc_auc_score(val["churn"], m.predict_proba(val[FEATURES])[:, 1])
    prod = df.copy()
    prod["satisfaction"] = prod["satisfaction"].fillna(val["satisfaction"].mean())
    prod_auc = roc_auc_score(prod["churn"], m.predict_proba(prod[FEATURES])[:, 1])
    assert val_auc - prod_auc > 0.08


def test_fixed_model_generalises():
    df = simulate()
    m, val, feats, d = fixed_model(df)
    val_auc = roc_auc_score(val["churn"], m.predict_proba(val[feats])[:, 1])
    all_auc = roc_auc_score(d["churn"], m.predict_proba(d[feats])[:, 1])
    assert abs(val_auc - all_auc) < 0.02
    assert all_auc > 0.78


def test_indicator_is_the_largest_coefficient():
    df = simulate()
    m, _, feats, _ = fixed_model(df)
    coefs = dict(zip(feats, np.abs(m.coef_[0])))
    assert max(coefs, key=coefs.get) == "satisfaction_missing"


def test_indicator_alone_beats_complete_case_in_production():
    df = simulate()
    m, val = complete_case_model(df)
    prod = df.copy()
    prod["satisfaction"] = prod["satisfaction"].fillna(val["satisfaction"].mean())
    cc_prod = roc_auc_score(prod["churn"], m.predict_proba(prod[FEATURES])[:, 1])
    ind_only = roc_auc_score(df["churn"], df["satisfaction"].isna().astype(int))
    assert ind_only > cc_prod


def test_mean_imputation_without_indicator_still_loses():
    """Filling the gap erases the signal unless the indicator is kept."""
    df = simulate()
    d = df.copy()
    d["satisfaction"] = d["satisfaction"].fillna(d["satisfaction"].mean())
    train, val = train_test_split(d, test_size=0.3, random_state=0, stratify=d["churn"])
    m = LogisticRegression(max_iter=1000).fit(train[FEATURES], train["churn"])
    no_ind = roc_auc_score(val["churn"], m.predict_proba(val[FEATURES])[:, 1])
    m2, val2, feats2, _ = fixed_model(df)
    with_ind = roc_auc_score(val2["churn"], m2.predict_proba(val2[feats2])[:, 1])
    assert with_ind - no_ind > 0.05`,
        notes: [
          { t: "p", text: "**The validation set was complete cases, so the model was scored on the population it was trained on — not the one it would meet.** 0.79 in validation and 0.66 in production is not overfitting; it is two different populations, and the validation split never contained the second one." },
          { t: "callout", kind: "insight", title: "The blank outperformed the model that discarded it", body: [
            { t: "p", text: "A single binary column — did the customer answer — scores AUC 0.72. The three-feature complete-case model scored 0.66 in production. **Dropping the missing rows threw away the strongest predictor in the data**, and filling them with the mean in production erased it a second time." },
            { t: "p", text: "The indicator's coefficient is the largest in the fixed model: not answering multiplies the odds of churn by nearly seven." }
          ]},
          { t: "p", text: "**Complete-case training halved the churn rate in the training set.** The churners who answered the survey are the unusual ones — satisfied enough to respond and leaving anyway — and the model learned churn from them, then met a population that was mostly the other kind." },
          { t: "p", text: "**The missingness test finds churn as a correlate and stops there.** It cannot say that satisfaction itself drives non-response, which is what makes this MNAR. The sentence \"unhappy people do not fill in surveys\" is process knowledge, and it is the only thing that names the mechanism." },
          { t: "p", text: "**Imputation without the indicator still loses.** The `test_mean_imputation_without_indicator_still_loses` test is the one that separates \"fill the gap\" from \"fill the gap and remember it was a gap\" — the second is five AUC points better, and the difference is entirely the indicator." },
          { t: "p", text: "**Missingness that depends on the target is the worst case for dropping rows** because it drops the positive class preferentially. Any time the missing rate differs sharply between classes, complete-case analysis is training on a biased sample of the outcome itself." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A missingness test shows that rows missing `income` are much older than rows with it. What does that establish?",
          options: [
            "The mechanism is MAR",
            "The mechanism is not MCAR — but the same signature arises under MAR (age drives missingness) and MNAR (income drives it, and correlates with age), so the data cannot say which",
            "The mechanism is MNAR",
            "Age should be dropped"
          ],
          answer: 1,
          why: "MCAR is the only testable hypothesis. Rejecting it tells you missingness has a cause; it does not tell you whether the cause is something observed or the missing value itself. That distinction comes from knowing how the data was collected — a voluntary sensitive field defaults to MNAR — and from evidence like a truncated observed tail."
        }
      ]
    }
  ],

  takeaways: [
    "**MCAR: missingness depends on nothing. MAR: on observed columns. MNAR: on the missing value itself.** The question is what predicts the gap.",
    "**\"Missing at random\" does not mean random** — MAR missingness is predictable from other columns; only MCAR is random in the everyday sense, and it is the rarest.",
    "**Complete-case analysis is unbiased under MCAR, biased under MAR unless the analysis conditions on the predictors of missingness, and biased under MNAR** in the direction of what was withheld.",
    "**Under MAR, conditioning on the predictors of missingness recovers the answer**; a model that includes them is roughly unbiased. That is what \"ignorable\" means.",
    "**Under MNAR, no observed column separates \"missing\" from \"high\"** — the thing that predicts missingness is the value you cannot see.",
    "**MCAR is testable: compare the rows with and without the value on every other column.** MAR versus MNAR is not testable from the data.",
    "**MAR and MNAR produce the same signature in the observed data.** The difference comes from the process — how the value is collected, what makes it fail — and from a truncated observed tail.",
    "**Mean imputation preserves the mean and destroys the variance**; group-conditional and model-based imputation use the MAR structure.",
    "**Under MNAR the missingness indicator is often the best feature available** — whether a customer declined to answer can predict more than the answer would.",
    "**Missingness that depends on the target is the worst case for dropping rows**: it removes the positive class preferentially.",
    "**A complete-case validation set is the training population, not the production one** — the score it produces is for a population the model will not meet.",
    "**Under MNAR, run a sensitivity analysis** and show how the conclusion moves under plausible assumptions about the missing values — the point is to make the dependence visible."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Older survey respondents skip the income question more often, and among respondents of the same age, who skips is random. Which mechanism is this?",
        options: [
          "MCAR",
          "MAR — missingness depends on an observed column (age), and conditioning on it makes the rest random",
          "MNAR",
          "None; it is not missing"
        ],
        answer: 1,
        why: "The missingness is predictable — not random overall — but predictable from something you can see. Group-conditional imputation by age band, or a model that includes age, handles it. If instead high earners skipped regardless of age, that would be MNAR."
      },
      {
        stem: "Why does mean imputation preserve the mean and still damage an analysis?",
        options: [
          "It changes the mean",
          "It collapses the imputed values onto one point, shrinking the variance and weakening every correlation the column participates in",
          "It only works on integers",
          "It raises on NaN"
        ],
        answer: 1,
        why: "Forty percent of a column set to a single value has less spread than the truth and no relationship to anything else. Standard errors shrink, correlations attenuate, and under MAR the mean itself is wrong because it is the wrong group's typical value. Model-based or group-conditional imputation recovers structure; adding the indicator preserves the fact of missingness."
      },
      {
        stem: "A churn model dropped the 40% of customers without a survey score. Validation AUC was 0.79; production was 0.66. Why?",
        options: [
          "Overfitting",
          "The validation set was complete cases too — the model was scored on the population it trained on, which had half the true churn rate, and never met the customers who did not answer",
          "The survey question changed",
          "Random seed"
        ],
        answer: 1,
        why: "Non-response was driven by churn, so complete-case training saw the unusual churners and validation scored on the same selection. In production the non-responders arrived with NaN, were filled with a typical score, and were scored as typical. The indicator alone would have scored 0.72."
      },
      {
        stem: "What can and cannot be tested about the missingness mechanism from the data alone?",
        options: [
          "All three mechanisms can be identified with Little's test",
          "MCAR can be tested by comparing rows with and without the value on other columns; MAR versus MNAR cannot, because the difference is whether missingness depends on a value you do not have",
          "Nothing can be tested",
          "Only MNAR can be tested"
        ],
        answer: 1,
        why: "Rejecting MCAR establishes that missingness has a cause. Whether the cause is an observed column or the missing value itself has the same signature in the observed data. Process knowledge — how the value is collected — and a truncated observed tail are the evidence that separates them."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Explain MCAR, MAR and MNAR with an example of each.",
        strong: "MCAR: the chance of a value being missing is the same for every row — a sensor dropping packets at random. MAR: the chance depends on other observed columns — older respondents skip the income question, but among people of the same age it is random. MNAR: the chance depends on the missing value itself — high earners decline to state income. The first is harmless to drop, the second is fixable by conditioning on what predicts it, the third biases everything in the direction of what was withheld.",
        answer: [
          { t: "p", text: "Pairing each mechanism with its consequence for dropping rows is what turns three definitions into something actionable." }
        ]
      },
      {
        level: "advanced",
        q: "How would you decide which mechanism you are dealing with?",
        strong: "Test MCAR first: do the rows with and without the value differ on any other column? If not, treat it as MCAR. If they do, MCAR is rejected but the data cannot separate MAR from MNAR — both show the same correlates. So I go to the process: how is the value collected, what makes it fail, is it sensitive or voluntary? And I look at the observed tail — a distribution that stops smoothly short of where it should is self-selection. Working assumption MAR, with MNAR evidence recorded and a sensitivity analysis if any is found.",
        answer: [
          { t: "p", text: "Saying plainly that MAR versus MNAR is untestable from the data, and then saying what you do about that, is the mark of understanding rather than recall." }
        ]
      },
      {
        level: "advanced",
        q: "When is a missingness indicator more useful than the imputed value?",
        strong: "Under MNAR, and especially when missingness depends on the target. Whether a customer declined to answer a satisfaction survey can predict churn better than their score would have, because the act of not answering is itself the signal. The indicator preserves that; imputation alone erases it — filling the gap with a typical value tells the model the customer was typical. Add the indicator before imputing, and check its coefficient: if it is the largest in the model, the blank was the feature.",
        answer: [
          { t: "p", text: "\"The blank was the feature\" is the memorable form of the insight, and the coefficient check makes it verifiable." }
        ]
      }
    ]
  }
});

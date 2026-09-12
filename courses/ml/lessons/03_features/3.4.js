/* ============================================================================
   LESSON 3.4 — Transforms, Interactions and Outliers
   ========================================================================= */
EC.receiveLesson({
  id: "3.4",

  lede: "**A linear model can only add up columns, so anything it must know that is not a sum of columns has to be built for it.** A skewed target that wants a log, a product of two features that no sum can express, a relationship that goes up and then down, an hour of day where 23 is next to 0 — each is a transform, and each is a bet about the shape of the data. This lesson runs the bets: a log that made the skew worse and a Box-Cox that fixed it; a hand-built interaction that took the spend model's error from £20 to £6 while thirty polynomial columns managed £15; bins and splines that lifted a logistic regression from 0.517 to 0.883 on a U-shaped risk; and the outlier rules — z, MAD, IQR, isolation forest — all pointed at the same fee of 999.",

  objectives: [
    "Apply log, Box-Cox, Yeo-Johnson and quantile transforms, read the skew before and after, and know when a log makes things worse",
    "Build interaction, polynomial and domain features, and show why one right product beats thirty generic ones",
    "Use binning and splines to let a linear model fit non-monotone shapes, and encode cyclical features with sine and cosine",
    "Winsorise, and detect outliers by z-score, modified z-score, IQR and isolation forest — then decide whether each is an error or a signal"
  ],

  prerequisites: ["3.1"],

  blocks: [

    { t: "h2", n: "01", text: "Reshaping a distribution", id: "transforms" },

    { t: "code", lang: "python", title: "The spend column, and four ways to unskew it (executed)",
      hl: [2, 3, 4, 5, 9, 10, 11],
      code: `spend_12m:  skew +0.59   mean 122.0   median 103.9   min 0.0                <- a right tail, and a hard zero
np.log1p(spend)                                  skew -2.06     <- WORSE: log1p stretches the zeros and near-zeros into a long left tail
PowerTransformer("box-cox").fit(spend + 1)       λ = 0.644     skew +0.03     <- a fitted power between sqrt (0.5) and identity (1): the right amount of bend
PowerTransformer("yeo-johnson").fit(spend)       λ = 0.644     skew +0.03     <- the same, and it accepts zeros and negatives
QuantileTransformer(output_distribution="normal")             skew  0.00     <- maps ranks to a normal: any shape becomes Gaussian, monotone, non-parametric

support_tickets (a count, 46 % zeros):   skew 0.93   log1p skew 0.32        <- for a count with zeros, log1p is the right bend`,
      caption: "The log is a reflex and not a rule: it is the right transform for a positive quantity spanning orders of magnitude (prices, incomes, counts) and the wrong one for a column with a hard floor near zero, where it manufactures a left tail. Box-Cox and Yeo-Johnson fit the exponent from the data and land where the skew is nearest zero; the quantile transform ignores shape entirely and forces a distribution. Which model needs any of this: linear models, distance methods and networks, for which a heavy tail is a lever a few rows can pull. Trees split on order and do not care."
    },

    { t: "code", lang: "python", title: "Transforming the target: a lesson in what the metric measures (executed)",
      hl: [2, 3],
      code: `# ridge on spend_12m, 5-fold, MAE in pounds
# raw target                                  MAE 20.04
# log1p target, predictions back-transformed  MAE 26.34       <- worse by six pounds
# the log-target model minimises squared error on the log scale -- relative error -- so it fits the small spenders well and the large
# ones badly in pounds; and expm1 of a mean log prediction is the median, not the mean, which is biased low (retransformation bias).
# a log target is right when the metric is relative (RMSLE, MAPE) or the errors are multiplicative; it is wrong when the metric is MAE in units.`,
      caption: "Transforming the target changes the objective, not just the scale. `TransformedTargetRegressor` makes the back-transform automatic, which is convenient and hides the fact that the model is now optimising something else. Decide from the metric (2.4): if the business cares about pounds, train on pounds or on a loss that measures pounds; if it cares about ratios, log the target and report RMSLE."
    },

    { t: "dl", items: [
      ["Log / log1p", "Compresses a right tail; turns multiplicative effects into additive ones. log1p for counts with zeros; undefined for negatives."],
      ["Box-Cox", "(x^λ − 1)/λ with λ fitted to make the result most Gaussian; λ = 0 is the log. Positive inputs only."],
      ["Yeo-Johnson", "Box-Cox extended to zero and negative inputs. The default power transform."],
      ["Quantile transform", "Replaces each value by its rank mapped onto a uniform or normal distribution. Destroys the scale, removes outliers' leverage, monotone; needs enough rows for the quantiles to be stable."],
      ["Interaction", "A product of two features. A linear model cannot learn 'fee × tenure' from fee and tenure separately."],
      ["Polynomial features", "All products and powers up to a degree. Degree 2 on 5 columns gives 20 columns; degree 3 gives 55. Regularise."],
      ["Binning / discretisation", "Cut a numeric feature into intervals and one-hot them. A linear model can then fit any step-shaped relationship; the cut points are the bet."],
      ["Splines", "Piecewise polynomials joined smoothly at knots. Bins without the steps: a linear model on spline features fits smooth curves."],
      ["Cyclical encoding", "sin(2πx/P) and cos(2πx/P) for a feature with period P. Hour 23 becomes a neighbour of hour 0."],
      ["Winsorisation", "Clip a feature at chosen percentiles (1st/99th). Keeps the row, removes the leverage."]
    ]},

    { t: "h2", n: "02", text: "Interactions: one right product against thirty generic ones", id: "interactions" },

    { t: "code", lang: "python", title: "The spend model: main effects, all pairwise products, and the one product that is the truth (executed)",
      hl: [2, 3, 4],
      code: `#   ridge, 5-fold MAE on spend_12m                       columns
#   main effects only                          £20.04        15
#   + all degree-2 interactions (PolynomialFeatures)  £14.68        30       <- helps: fee x tenure is in there among 15 products
#   + one hand-built feature: fee x min(tenure, 12) x (1 - discount)   £6.39        16    <- the generating formula (1.2); 14 fewer columns, a third of the error
# the gradient booster in 1.2 reached £7.43 by discovering the interaction through splits. A linear model given the right feature beat it.`,
      caption: "This is the strongest argument for domain features: the interaction the business already knows — spend is fee times months times discount — is worth more than any amount of generic expansion, and a linear model with it outperforms a booster without it. Polynomial features are the tool when you do not know which interaction matters; they need regularisation because most of the 30 columns are noise, and they scale badly (degree 3 on 20 columns is 1,770 columns)."
    },

    { t: "table",
      head: ["Feature idea", "Built from", "Example on the churn table", "Model that needs it"],
      rows: [
        ["Ratio", "a / b", "tickets per month of tenure; logins per pound of fee", "Linear, distance"],
        ["Product", "a × b", "fee × tenure (spend); discount × paid-channel", "Linear, distance"],
        ["Difference / delta", "a − b, or a − lag(a)", "logins this month minus last month (10.6)", "All, when the trend matters more than the level"],
        ["Datetime parts", "year, month, day-of-week, hour, is-weekend, days-since", "sign-up month; days since last login", "All"],
        ["Cyclical", "sin/cos of hour, weekday, month", "hour of last login", "Linear, distance"],
        ["Aggregates", "group mean, count, rank", "region churn rate (target-encoded, in-fold — 3.2); customer's rank in plan by logins", "All"],
        ["Text-derived", "length, counts, presence", "number of words in a complaint", "All"],
        ["Geo", "distance to a point, cluster id, lat/lon rotated 45°", "distance from the nearest store", "Trees need rotations; linear needs distances"],
        ["Indicator", "a > threshold, is-missing, is-zero", "has ever complained; fee is zero (a free trial)", "All"]
      ]
    },

    { t: "h2", n: "03", text: "Letting a line bend: bins, splines, cycles", id: "bend" },

    { t: "code", lang: "python", title: "A U-shaped risk in one feature, and four linear models (executed, 3,000 synthetic rows)",
      hl: [2, 3, 4, 5],
      code: `# risk is high at very low and very high values of x and low in the middle
#   logistic on raw x                          AUC 0.517       <- a line cannot go up then down: no better than a coin
#   logistic on 8 quantile bins, one-hot       AUC 0.866       <- eight step heights: it can
#   logistic on cubic splines, 6 knots         AUC 0.883       <- smooth version of the same
#   logistic on x and x²                       AUC 0.883       <- when the shape is a parabola, two columns suffice`,
      caption: "A linear model's inductive bias is monotone effects. Binning, splines and polynomial terms are three ways to hand it a shape it cannot find, and they differ in what they assume: bins assume steps and waste the within-bin variation; splines assume smoothness and generalise better; a polynomial assumes a global shape and explodes outside the data. `KBinsDiscretizer` and `SplineTransformer` are Pipeline steps, so the cut points and knots are fitted on the training fold like everything else."
    },

    { t: "code", lang: "python", title: "Cyclical encoding: hour 23 is next to hour 0 (executed)",
      hl: [2, 3, 9],
      code: `hour = [0, 1, 6, 12, 18, 23]
sin(2π·hour/24)   [ 0.000,  0.259,  1.000,  0.000, -1.000, -0.259]
cos(2π·hour/24)   [ 1.000,  0.966,  0.000, -1.000, -0.000,  0.966]

# distance from hour 23 to hour 0:
#   raw integers       |23 - 0| = 23         <- the two adjacent hours are the furthest apart in the whole column
#   (sin, cos) pair    0.261                  <- the same as hour 0 to hour 1
# every hour is a point on a circle; the pair gives a linear model two coordinates on which 'late night' is one region`,
      caption: "Day of week, month of year, angle of the wind, minute of the hour: anything periodic gets the same treatment, with its own period. Trees can approximate the circle with a few splits and usually do not need it; linear models and distances need both columns, because sine alone maps hour 6 and hour 18 to opposite values and hour 3 and hour 9 to the same one."
    },

    { t: "viz",
      title: "Three ways to let a linear model bend",
      caption: "The true risk is U-shaped. A logistic regression on the raw feature fits a flat line (AUC 0.517). Quantile bins fit a staircase (0.866); cubic splines fit a smooth curve (0.883); x and x² fit a parabola (0.883). Each is a different assumption about the shape, made explicit.",
      svg: `<svg viewBox="0 0 880 260" role="img" aria-label="A U-shaped true risk curve over a feature axis, with four fitted curves overlaid: a flat line for the raw logistic, a staircase for binned, a smooth curve for splines, and a parabola for the quadratic.">
  <line x1="80" y1="220" x2="840" y2="220" style="stroke:var(--line)" stroke-width="1.2"/>
  <line x1="80" y1="220" x2="80" y2="30" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="460" y="245" class="s-sub" text-anchor="middle">x</text>
  <text x="50" y="125" class="s-sub" text-anchor="middle" transform="rotate(-90 50 125)">risk</text>
  <path d="M100,50 C250,50 350,200 460,200 C570,200 670,50 820,50" fill="none" style="stroke:var(--ink-3)" stroke-width="3" stroke-opacity=".5"/>
  <line x1="100" y1="128" x2="820" y2="126" style="stroke:var(--crit)" stroke-width="2"/>
  <polyline points="100,62 190,62 190,120 280,120 280,180 370,180 370,200 460,200 460,198 550,198 550,175 640,175 640,118 730,118 730,60 820,60" fill="none" style="stroke:var(--warn)" stroke-width="2"/>
  <path d="M100,56 C250,56 350,196 460,196 C570,196 670,56 820,56" fill="none" style="stroke:var(--good)" stroke-width="2" stroke-dasharray="6 3"/>
  <g class="s-label" style="font-weight:600">
    <text x="640" y="30" style="fill:var(--ink-3)">true risk</text>
    <text x="640" y="148" style="fill:var(--crit)">raw x: a flat line, 0.517</text>
    <text x="100" y="100" style="fill:var(--warn)">8 bins: a staircase, 0.866</text>
    <text x="100" y="45" style="fill:var(--good)">splines / x²: a curve, 0.883</text>
  </g>
</svg>`
    },

    { t: "h2", n: "04", text: "Outliers: find, then decide", id: "outliers" },

    { t: "code", lang: "python", title: "Four detectors on the fee column with its planted 999 (executed)",
      hl: [3, 4, 5, 6, 9, 10],
      code: `fee: 990 rows, one 999.0 among values of 6-21
# rule                                          flags
# z-score |z| > 3                                 1        <- the 999 (its own inflation of the std nearly hid it: z = 31, but a second outlier would have)
# modified z-score, MAD-based, > 3.5              1        <- median and MAD do not move: robust to the outliers it is looking for
# IQR fences  Q1 - 1.5 IQR, Q3 + 1.5 IQR          2        <- fences at 0.09 and 21.16: the 999 and one legitimate pro-plan fee of 21.2
# isolation forest, contamination 2 %            20        <- ranks the 999 as the single most anomalous row (score -0.685, the minimum), plus 19 heavy-login rows

# winsorising at the 1st and 99th percentiles (6.98 / 20.72):  the 999 becomes 20.72; the mean moves from 12.49 to 11.50; the row stays`,
      caption: "Detection is the easy half. The z-score rule is fragile because the outlier inflates the std it is measured against — with two 999s, neither would reach z = 3; the MAD version does not have that problem. The IQR rule caught a legitimate pro-plan fee, which is the reminder that 'outlier' is a statistical label and not a verdict. Isolation forest (9.5) scores multivariate strangeness and ranked the planted error first. **Then the decision**: an error is corrected or removed (no plan costs 999); a real extreme is kept, and winsorised or robust-scaled if a linear or distance model would otherwise let it lead."
    },

    { t: "table",
      head: ["The outlier is…", "Do", "Do not"],
      rows: [
        ["A data error (impossible value, unit mix-up, sentinel like −1 or 9999)", "Fix at the source; else set to NaN and impute with an indicator (3.3)", "Winsorise it into a plausible-looking lie"],
        ["A real extreme that the model will meet again (a whale customer, a viral post)", "Keep; winsorise or robust-scale for linear and distance models; log if multiplicative; leave alone for trees", "Delete it — the deployed model will meet the next one"],
        ["A real extreme that will never recur (a one-off event)", "Remove from training with a note; keep in evaluation if it could recur", "Pretend it did not happen in the report"],
        ["The signal itself (fraud, fault, anomaly)", "Model it: 9.4–9.5", "Clean it away"]
      ]
    },

    { t: "callout", kind: "trap", title: "Transforms are fitted, too", body: [
      { t: "p", text: "Box-Cox's λ, the quantile transform's quantiles, the bin edges, the spline knots, the winsorisation percentiles — every one is a statistic of the data it was fitted on. Fit them on the training fold, inside the Pipeline, like a scaler. A quantile transform fitted on all rows leaks the test rows' ranks; bin edges chosen by looking at the target are a target-encoding leak wearing a different hat. And a transform the model was trained with is part of the model: serving must apply the same λ, edges and knots to every new row." }
    ]},

    { t: "ladder",
      title: "A 'purchase amount' feature for a linear fraud model — right-skewed, a hard zero, a few huge values",
      rungs: [
        { level: "bad", label: "Raw, into the regression", code: `LogisticRegression().fit(X[["amount"]], y)`,
          note: "**The three huge values are three levers**; the coefficient is set by them and the 99 % of ordinary amounts are indistinguishable near zero." },
        { level: "ok", label: "log1p", code: `np.log1p(X.amount)`,
          note: "**Compresses the tail; keeps the zeros at zero.** Right for an amount that spans orders of magnitude. The zeros still form a spike a linear model treats as 'a very small purchase'." },
        { level: "best", label: "log1p plus an is-zero indicator, winsorised at the 99.9th percentile, fitted in-fold", code: `ColumnTransformer([("amt", make_pipeline(FunctionTransformer(np.log1p), Winsor(0.999)), ["amount"]),
                   ("zero", FunctionTransformer(lambda a: (a == 0).astype(int)), ["amount"]), ...])`,
          note: "**The zero is a category (a free transaction, a test), the tail is compressed and capped, and the percentile is learned on training rows.** Three columns that each say one thing." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Feature engineering that a booster cannot see",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "Build five engineered features for the churn table — tickets per month of tenure, logins per pound of fee, a `first_year` indicator (tenure ≤ 12), the sin/cos pair of sign-up month if you construct a sign-up date from tenure, and a `tickets_missing` indicator — and compare a logistic regression and a gradient booster with and without them by 5-fold AUC. Then fit `PowerTransformer` on the numeric columns inside the pipeline and check whether it changes either model. Finally, run the four outlier detectors on `logins_30d` and decide, with a reason, what to do with what they flag." }
      ],
      requirements: [
        "A 2 × 2 AUC table (two models × with/without features) with spreads.",
        "The power-transform comparison, with a sentence on why it did or did not matter for each model.",
        "The four detectors' flag counts on logins and a decision."
      ],
      hint: "Ratios and indicators can help a logistic regression more than a booster — trees find ratios and thresholds by splitting — but only if the hypothesis they encode is true of this data; measure, do not assume. Expect the power transform to do nothing for the booster (monotone). Logins outliers are heavy users: real, recurring, keep them.",
      solution: {
        lang: "python",
        title: "engineered.py",
        code: `def engineer(d):
    e = d.copy()
    e["tickets_per_month"] = e.support_tickets / e.tenure_months
    e["logins_per_pound"]  = e.logins_30d / e.monthly_fee
    e["first_year"]        = (e.tenure_months <= 12).astype(int)
    signup_month = ((12 - e.tenure_months) % 12) + 1                      # a constructed month; in real data, use the date
    e["su_sin"], e["su_cos"] = np.sin(2 * np.pi * signup_month / 12), np.cos(2 * np.pi * signup_month / 12)
    e["tickets_missing"]   = e.support_tickets.isna().astype(int)
    return e
extra = ["tickets_per_month", "logins_per_pound", "first_year", "su_sin", "su_cos", "tickets_missing"]
for feats in [num, num + extra]:
    pre = ColumnTransformer([("num", make_pipeline(SimpleImputer(strategy="median"), StandardScaler()), feats), ("cat", OneHotEncoder(handle_unknown="ignore"), cat)])
    for mname, m in [("logistic", LogisticRegression(max_iter=2000)), ("gbdt", HistGradientBoostingClassifier(max_iter=150, learning_rate=0.05, max_depth=2))]:
        s = cross_val_score(Pipeline([("pre", pre), ("m", m)]), engineer(d)[feats + cat], d.churned, cv=cv, scoring="roc_auc")
        print(len(feats), mname, round(s.mean(), 3), round(s.std(), 3))
# then: replace StandardScaler with make_pipeline(PowerTransformer(), StandardScaler()) in the numeric branch and rerun both models

# executed:                                  logistic            gbdt
#   5 base features, standardised            0.747 ± 0.033      0.740 ± 0.032
#   5 base, power-transformed                0.747 ± 0.027      0.740 ± 0.032     <- identical for the booster (monotone); no change for logistic
#   11 features, standardised                0.744 ± 0.030      0.740 ± 0.035     <- the six engineered features added nothing to either model
#   11 features, power-transformed           0.738 ± 0.023      0.738 ± 0.036
# the honest result: on this table the ratios encode hypotheses the data does not reward -- tickets per month is not more predictive than
# tickets, and the constructed sign-up month carries no signal because it was constructed. Six extra columns are six sources of variance
# with nothing to pay for them; the base features stay. Feature engineering is a hypothesis test, and this one came back negative.

# outliers on logins_30d:   z > 3: 11 rows   modified z > 3.5: 11   IQR fences (-3.5, 24.5): 17   isolation forest 2 %: 17   -- all heavy users, 26-31 logins
# decision: 17 customers with 25+ logins churn at 0.059 against 0.162 overall. They are real, they recur every month, and they are the least
# likely to churn: keep every row. The logistic regression is scaled and logins are not extreme in ratio terms, so no winsorisation. Flagging is not fixing.`,
        notes: [
          { t: "p", text: "**The ratios encode hypotheses**: 'complaints relative to how long they have been a customer' is a different quantity from raw complaints, and a linear model can only see it if it is built. Here the hypothesis was not rewarded — the base columns already carried what the ratios say — and the right response to a negative result is to keep the simpler feature set, not the story." },
          { t: "p", text: "**The power transform is a no-op for the booster by construction** — monotone transforms do not change splits — and its effect on the logistic regression depends on how skewed the columns were. Measuring it is the point; assuming it is the mistake." },
          { t: "p", text: "**The outlier decision is a sentence, not a threshold**: what the flagged rows are, whether they recur, and which model would be hurt. Heavy users are signal." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "log1p turned spend's skew from +0.59 to −2.06. Why, and what should have been used?",
          options: [
            "The log was applied to the wrong column",
            "spend has a hard floor at zero with many small values; log1p stretches the region near zero into a long left tail. A fitted power transform (Box-Cox / Yeo-Johnson, λ = 0.644 here) bends the column only as much as its shape needs, and left the skew at 0.03",
            "Skew cannot be changed by transforms",
            "The quantile transform should never be used"
          ],
          answer: 1,
          why: "The log is right for quantities spanning orders of magnitude. Measure the skew after, not just before."
        }
      ]
    }
  ],

  takeaways: [
    "**A linear model adds columns; anything else must be built** — products, ratios, bends, cycles.",
    "**The log is a reflex, not a rule**: it took spend's skew from +0.59 to −2.06; Box-Cox at λ = 0.644 took it to 0.03.",
    "**Transforming the target changes the objective**: the log-target ridge was £6 worse in MAE, because it optimised relative error and back-transformed to a median.",
    "**One domain interaction beat thirty generic ones**: £6.39 against £14.68 against £20.04; polynomial features need regularisation and do not scale.",
    "**Bins, splines and squares let a line bend**: 0.517 → 0.866 → 0.883 on a U-shaped risk; each is a different shape assumption.",
    "**sin/cos for anything periodic**: hour 23 became a neighbour of hour 0 at distance 0.261.",
    "**Trees are indifferent to monotone transforms**; linear, distance and network models are not.",
    "**Detect outliers with the MAD z-score or IQR, and isolation forest for multivariate strangeness**; the plain z-score is inflated by the outliers it seeks.",
    "**Then decide**: fix errors, keep real extremes (winsorise for sensitive models), model anomalies when they are the signal.",
    "**Every transform is fitted** — λ, quantiles, edges, knots, percentiles — on the training fold, inside the Pipeline, and carried to serving."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why did the hand-built fee × tenure × discount feature beat PolynomialFeatures(2)?",
        options: [
          "Polynomial features are always worse",
          "The true relationship is one specific three-way product with a clip at twelve months; degree-2 expansion produced 15 pairwise products of which one was close, plus 14 noise columns that the penalty had to suppress. Domain knowledge supplied the exact term; expansion approximated it and paid in variance",
          "Ridge cannot use polynomial features",
          "The hand-built feature leaked the target"
        ],
        answer: 1,
        why: "£6.39 against £14.68. When you know the mechanism, encode it; when you do not, expand and regularise — and prefer a tree model, which found it on its own at £7.43."
      },
      {
        stem: "When is binning a numeric feature the right choice?",
        options: [
          "Always, for interpretability",
          "When a linear model must capture a non-monotone or step-shaped relationship and smooth alternatives (splines) are unavailable or the steps are real (age bands with policy thresholds); it wastes within-bin variation, and for trees it only removes information",
          "For tree models, to speed them up",
          "Never; it loses information"
        ],
        answer: 1,
        why: "Bins lifted a logistic regression from 0.517 to 0.866 on a U-shape; splines did better at 0.883. On a tree the same bins would be a loss."
      },
      {
        stem: "Why is the plain z-score a weak outlier detector?",
        options: [
          "It is too sensitive",
          "The std it divides by is inflated by the very outliers it seeks, so two extreme values can hide each other below the threshold; the modified z-score uses the median and MAD, which the outliers cannot move",
          "It only works for normal data",
          "It requires scaling first"
        ],
        answer: 1,
        why: "One 999 gave z = 31; two would give each about z = 22 on a std doubled again — still flagged here, but a handful of moderate outliers can pull each other under 3."
      },
      {
        stem: "A power transform is added to a pipeline that ends in a gradient booster, and nothing changes. Why?",
        options: [
          "The transform was fitted wrongly",
          "Box-Cox and Yeo-Johnson are monotone, and a tree's splits depend only on the order of values, so every split point maps to an equivalent one and the model is identical; the transform matters for linear, distance and network models",
          "Boosters ignore numeric features",
          "The power transform needs scaling after it"
        ],
        answer: 1,
        why: "The same reason trees are immune to scaling (3.1). Adding the transform costs a fitted object for nothing."
      },
      {
        stem: "What is the risk of choosing bin edges by looking at the target?",
        options: [
          "None; it improves the bins",
          "The edges then encode the target, as a target encoding does; chosen on all rows they leak the validation labels into the feature, and the cross-validated score is inflated. Edges must be chosen on the training fold — by quantiles, by domain knowledge, or by a supervised discretiser fitted inside the Pipeline",
          "The bins become too narrow",
          "It only matters for regression"
        ],
        answer: 1,
        why: "Anything fitted with the label, outside the fold, is the leak of 1.6. Bin edges are a fitted quantity."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How do you deal with a skewed feature or target?",
        strong: "First ask which model cares: trees split on order and are indifferent, so skew matters for linear models, distance methods and networks, where a heavy tail is leverage for a few rows. For those, a log is right when the quantity is positive and spans orders of magnitude — prices, counts with log1p — but it can make things worse on a column with a floor near zero: on a spend column it turned skew of +0.6 into −2.1. Box-Cox or Yeo-Johnson fit the exponent to the data and landed at 0.03; a quantile transform forces any shape to normal at the cost of the scale. For a target, transforming changes the objective: a log target optimises relative error and back-transforms to a median, which cost six pounds of MAE in my run — so the choice follows from the metric, not from the histogram. And every transform is fitted on the training fold inside the pipeline.",
        answer: [
          { t: "p", text: "Which models care, log with its failure mode, the fitted alternatives, the target caveat, in-fold." }
        ]
      },
      {
        level: "core",
        q: "How do you detect and handle outliers?",
        strong: "Detect with a rule that the outliers cannot corrupt: the MAD-based modified z-score or the IQR fences rather than the plain z-score, whose std is inflated by the outliers themselves, and an isolation forest when strangeness is multivariate. Then classify before acting: a data error — an impossible value, a unit mix-up, a sentinel — is corrected or set to missing with an indicator; a real extreme that will recur is kept, and winsorised or robust-scaled if a linear or distance model would otherwise be led by it, and left alone for trees; a one-off event is removed from training with a note; and if the outliers are the thing being predicted — fraud, faults — they are the signal and get a model of their own. The mistake is deleting rows because a rule flagged them: the IQR rule flagged a legitimate pro-plan fee alongside the planted error.",
        answer: [
          { t: "p", text: "Robust detection, classification before action, and the deletion trap with an example." }
        ]
      },
      {
        level: "advanced",
        q: "How do you decide which interaction and polynomial features to add?",
        strong: "From the mechanism first: if the domain says spend is fee times months times discount, that product is the feature, and in my run it took a ridge model from twenty pounds of error to six while a full degree-2 expansion managed fifteen with twice the columns. When the mechanism is unknown, the cheap diagnostic is to fit a tree model and look at which pairs of features appear together on paths, or at SHAP interaction values, then build those products for the linear model. Generic polynomial expansion is the fallback: it grows combinatorially — degree 3 on 20 columns is 1,770 — so it needs strong regularisation and is only sensible on a few columns. For shape rather than interaction, splines beat bins beat powers for smooth relationships, and cyclical features get sine and cosine. And I would test every addition by cross-validated metric with the spread, because most engineered features add variance and nothing else.",
        answer: [
          { t: "p", text: "Mechanism, then tree-guided discovery, then generic expansion with its cost, and measure everything." }
        ]
      }
    ]
  }
});

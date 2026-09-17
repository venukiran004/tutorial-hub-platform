/* ============================================================================
   LESSON 9.1 — Global Explanations: Importance, PDP and ALE
   ========================================================================= */
EC.receiveLesson({
  id: "9.1",

  lede: "**A model that scores well is not yet a model anyone can act on, audit, or trust with a decision — for that you need to know which inputs it uses, how, and whether the way it uses them is the way the world works.** This lesson is the global half of that: what the model does across the whole dataset. Permutation importance is computed by hand (five shuffles of the logins column drop the AUC by 0.10–0.12), then shown failing on the course's collinear pair — fee and plan share their importance, and permuting the group is the honest number. Partial dependence is computed, then broken deliberately: on two features correlated at 0.9 the PDP recovers a slope of 1.58 where the truth is 2.0, because it asks the model about combinations that never occurred and trees answer with a flat guess; accumulated local effects recover 1.99 by asking only about small moves inside the data. ICE curves show the fee's effect on spend is 4 per pound for new customers and 12 for old ones — an interaction the average hides — and the H-statistic puts a number on it (0.034 against 0.000 for a linear model). The lesson opens with the map: intrinsic against post-hoc, global against local, agnostic against specific.",

  objectives: [
    "Place any explanation method in the taxonomy — intrinsic/post-hoc, global/local, model-agnostic/specific — and choose accordingly",
    "Compute permutation importance by hand, read its uncertainty, and handle correlated groups",
    "Compute partial dependence and ALE, explain why PDP extrapolates on correlated inputs and how ALE avoids it, and read ICE curves for heterogeneity",
    "Quantify an interaction with Friedman's H-statistic"
  ],

  prerequisites: ["6.2", "4.2", "7.4"],

  blocks: [

    { t: "h2", n: "01", text: "The taxonomy, and what each axis buys", id: "taxonomy" },

    { t: "table",
      head: ["Axis", "One side", "Other side", "Trade"],
      rows: [
        ["When", "**Intrinsic**: the model is its own explanation — coefficients (4.1, 4.5), a pruned tree (6.1), a GAM", "**Post-hoc**: computed after training on any model — permutation importance, PDP, SHAP, LIME, Grad-CAM", "Intrinsic models may sacrifice accuracy (logistic 0.752 vs the tuned forest on spend); post-hoc methods keep the accurate model and add computation and approximation"],
        ["Scope", "**Global**: the model's behaviour over the dataset — importance rankings, PDP/ALE, H-statistic", "**Local**: one prediction — SHAP values for a row, LIME, anchors, counterfactuals (9.2)", "Global answers 'what does the model do'; local answers 'why this decision'. Regulation usually wants the second; debugging usually needs the first"],
        ["Access", "**Model-agnostic**: black box, needs only predict — permutation, PDP, LIME, KernelSHAP", "**Model-specific**: uses internals — TreeSHAP, coefficients, Grad-CAM, attention", "Agnostic methods are portable and slow; specific ones are exact and fast for their family"]
      ]
    },

    { t: "callout", kind: "mental", title: "What an explanation is, and is not", body: [
      { t: "p", text: "Every method in this module explains **the model**, not the world. Permutation importance says which columns the model relies on; if 1.5's refund column were in the features it would rank first, because the model relies on it, and it is an effect of churn, not a cause. A partial dependence curve says how the *model's* prediction moves with a feature, which equals how the outcome moves only if the model is right and the feature is not confounded. Read every plot in this lesson as 'the model believes'; whether the model is right is the job of 2.x, and whether the relationship is causal is 11.7's." }
    ]},

    { t: "h2", n: "02", text: "Permutation importance", id: "permutation" },

    { t: "code", lang: "python", title: "The churn logistic model: importance as the score drop when a column is shuffled (executed; 30 % hold-out, 30 repeats)",
      hl: [3, 4, 5, 9, 10],
      code: `# test AUC 0.7206.  permutation_importance(model, X_test, y_test, scoring="roc_auc", n_repeats=30)
#   feature              AUC drop (mean ± sd over 30 shuffles)
#   logins_30d           +0.0946 ± 0.0277      <- the model's main lever
#   tenure_months        +0.0607 ± 0.0205
#   support_tickets      +0.0313 ± 0.0099
#   channel_paid         +0.0172 ± 0.0140
#   monthly_fee          +0.0158 ± 0.0085
#   channel_referral     +0.0032 ± 0.0069      <- within noise of zero
#   region_south         +0.0028 ± 0.0070
# by hand, logins_30d: shuffle the column, rescore, subtract -- five shuffles: 0.110, 0.108, 0.117, 0.100, 0.123, mean 0.111`,
      caption: "Shuffling a column keeps its distribution and destroys its relationship to everything else, so the score drop is what the model *loses* without it — on held-out data, in the metric you care about, for any model. The ± column matters: a 30-repeat standard deviation of 0.028 on the top feature means a single shuffle can mis-rank the top two, and the bottom rows are indistinguishable from zero. Report the spread, and rank only where the intervals separate."
    },

    { t: "code", lang: "python", title: "The correlated-feature trap, and the group fix (executed)",
      hl: [2, 3, 4, 6],
      code: `# monthly_fee is a function of plan (7.99 / 12.99 / 19.99 by tier, 4.5): three columns carry one piece of information
#   monthly_fee     +0.0158       plan_plus     -0.0005       plan_pro     +0.0012        <- the plan dummies look useless
#   shuffle the GROUP {fee, plan_plus, plan_pro} together, 30 repeats:  +0.0181 ± 0.0135
#   (the sum of the three single importances: +0.0165 -- close here because the model leans on fee; with a stronger shared signal the singles can each be near zero while the group matters)

# train-set vs test-set importance for an unpruned forest:
#   tenure_months    train +0.0940    test +0.0359       <- the forest memorised tenure; on the training rows shuffling it 'costs' a lot
#   logins_30d       train +0.0639    test +0.0692
#   support_tickets  train +0.0086    test +0.0190
#   monthly_fee      train +0.0237    test +0.0138`,
      caption: "Two failure modes, both already met in 6.2. When columns share information, shuffling one leaves the information available through the others, so each looks unimportant while the set is essential — permute correlated groups together, or read the singles with that in mind. And importance computed on the training rows measures memorisation as much as reliance: the forest's tenure importance is 0.094 on rows it fitted and 0.036 on rows it did not. Compute it on held-out data."
    },

    { t: "dl", items: [
      ["Permutation importance", "Score drop when a feature is shuffled; agnostic, metric-aware, held-out. Correlated features share credit; permute groups."],
      ["MDI importance", "Impurity decrease summed over a tree's splits (6.1): fast, training-set, biased toward many-valued columns. Not this lesson's tool."],
      ["Partial dependence (PDP)", "Set a feature to a value for every row, predict, average: the model's mean response as the feature varies, other features left at their own values. Assumes the feature can vary independently of the rest."],
      ["ICE", "Individual conditional expectation: the PDP's per-row curves before averaging. Diverging ICE curves mean an interaction the PDP hides."],
      ["ALE", "Accumulated local effects: within narrow bins of the feature, the mean change in prediction from the bin's lower to upper edge, accumulated across bins and centred. Uses only small moves inside the data, so correlated inputs do not force extrapolation."],
      ["H-statistic", "Friedman's H²: the share of the joint partial dependence's variance not explained by the two one-feature partial dependences. 0 for an additive model, 1 for a pure interaction."]
    ]},

    { t: "h2", n: "03", text: "Partial dependence, ICE, and the case for ALE", id: "pdp" },

    { t: "code", lang: "python", title: "PDP on the churn boosting model: the shape of each effect (executed, probability scale)",
      code: `# mean P(churn) with the feature set to the 5th / 25th / 50th / 75th / 95th percentile for every row:
#   logins_30d       grid [4, 7, 10, 14, 20]         -> [0.334, 0.220, 0.159, 0.082, 0.061]     <- monotone, steep at the low end: the first few logins matter most
#   tenure_months    grid [3, 16, 30, 46, 58]        -> [0.274, 0.190, 0.167, 0.130, 0.056]
#   support_tickets  grid [0, 0, 1, 1, 2]            -> [0.145, 0.145, 0.158, 0.158, 0.213]     <- each ticket adds; the third adds most`,
      caption: "A PDP turns an opaque model into a curve per feature, in the units of the prediction: the model's belief that a customer with four logins has a 33 % chance of leaving against 6 % at twenty. It is the natural companion to 4.5's odds ratios for a non-linear model — and it inherits an assumption the odds ratio also makes, that the feature can be moved while everything else stays put."
    },

    { t: "code", lang: "python", title: "When features are correlated, the PDP asks about rows that do not exist (executed)",
      hl: [3, 4, 5, 7, 9],
      code: `# truth y = 2 x₁ − x₂ + noise,   corr(x₁, x₂) = 0.90,   gradient boosting fitted on 6,000 rows
#   x₁ grid (5th..95th pct)      -1.62    -0.68    -0.03    0.67    1.66
#   PDP (centred at the median)  -2.51    -1.04     0       1.23    2.67       slope 5th -> 95th:  1.58
#   ALE (centred at the median)  -3.20    -1.30     0       1.36    3.33       slope 5th -> 95th:  1.99
#   truth: the direct effect of x₁ is +2.0 per unit
# why: at x₁ = 1.66 the PDP queries the model with each row's OWN x₂ -- and for 74 % of rows that x₂ is more than 2 sd from what accompanies
#      such an x₁ in the data. The trees never saw those combinations and extrapolate flat, so the PDP's ends are compressed.
# with independent inputs (x₂ redrawn): PDP slope 2.02, ALE slope 2.01 -- they agree when the assumption holds`,
      caption: "The PDP's construction — set x₁ to a value for every row — creates, for a strongly correlated pair, thousands of rows in a region the training data never covered; a tree model returns its edge value there, a linear model returns a confident extrapolation, and neither is evidence. ALE asks a question the data can answer: for rows whose x₁ is already near this value, how much does the prediction change when x₁ moves a little? Those small moves stay inside the data, and the accumulated answer recovers the true slope. The rule: check the correlation matrix before reading a PDP; above ~0.5, use ALE."
    },

    { t: "viz",
      title: "PDP and ALE against the truth on correlated inputs (executed values)",
      caption: "Same model, same grid. The ALE curve lies on the true effect; the PDP flattens toward both ends, where it is averaging the model's flat extrapolation over impossible rows.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Three lines of effect against x1 from -1.62 to 1.66. The truth is a straight line of slope 2; ALE follows it almost exactly; PDP is shallower at both ends with slope 1.58 overall.">
  <g style="stroke:var(--line)" stroke-width="1"><line x1="80" y1="150" x2="820" y2="150"/><line x1="80" y1="30" x2="80" y2="270"/></g>
  <g class="s-sub">
    <text x="72" y="60" text-anchor="end">+3</text><text x="72" y="123" text-anchor="end">+1</text><text x="72" y="185" text-anchor="end">−1</text><text x="72" y="248" text-anchor="end">−3</text>
    <text x="100" y="290" text-anchor="middle">−1.62</text><text x="301" y="290" text-anchor="middle">−0.68</text><text x="439" y="290" text-anchor="middle">−0.03</text><text x="589" y="290" text-anchor="middle">0.67</text><text x="800" y="290" text-anchor="middle">1.66</text>
    <text x="440" y="24" text-anchor="middle">effect of x₁ on the prediction, centred at the median</text>
  </g>
  <polyline fill="none" style="stroke:var(--ink-3)" stroke-width="2" stroke-dasharray="6 4" points="100,250 301,191 439,150 589,106 800,44"/>
  <polyline fill="none" style="stroke:var(--good)" stroke-width="2.6" points="100,251 301,191 439,150 589,107 800,45"/>
  <polyline fill="none" style="stroke:var(--crit)" stroke-width="2.4" points="100,229 301,183 439,150 589,111 800,66"/>
  <g class="s-label" style="font-weight:600">
    <text x="640" y="58" style="fill:var(--good)">ALE: slope 1.99</text>
    <text x="640" y="100" style="fill:var(--crit)">PDP: slope 1.58</text>
    <text x="120" y="270" style="fill:var(--ink-3)">truth: slope 2.0 (dashed)</text>
  </g>
</svg>`
    },

    { t: "code", lang: "python", title: "ICE: the average hides an interaction (executed; spend model, whose truth is fee × min(tenure, 12) × (1 − discount))",
      hl: [3, 4, 5],
      code: `# partial_dependence(model, X, ["monthly_fee"], kind="both"): the average and every row's own curve
#   fee grid                       7.11    10.48    13.85    17.22    20.59
#   PDP (average spend)            73.8    106.4    149.8    183.7    224.5         slope 11.2 per pound
#   ICE slope for tenure <= 3 months:    4.0 per pound        <- a new customer pays the fee for tenure months only
#   ICE slope for tenure >= 12 months:  12.1 per pound        <- a settled customer pays it for the full twelve
#   truth: tenure × (1 − discount) for short tenure, 12 × (1 − discount) beyond`,
      caption: "The PDP says a pound of fee is worth 11 of spend; that number is true of no customer — it is the average of 4 for the new and 12 for the old. ICE curves are the PDP before it is averaged, one per row, and when they fan out or cross, the feature's effect depends on something else: the definition of an interaction. Plot them alongside the PDP (`kind=\"both\"`), and when they diverge, look for the feature that sorts them."
    },

    { t: "code", lang: "python", title: "The H-statistic, computed from partial dependences on 300 rows (executed)",
      hl: [3, 4, 5],
      code: `# H²(j, k) = Σ [PD_jk(x_j, x_k) − PD_j(x_j) − PD_k(x_k)]² / Σ PD_jk(x_j, x_k)²        (each PD centred; evaluated at the rows' own values)
#   boosting model on spend:
#   H²(fee, tenure)       0.034     <- the fee × min(tenure, 12) product: 3.4 % of the joint effect's variance is not additive
#   H²(fee, discount)     0.005     <- fee × (1 − discount) is a weaker interaction over the observed discounts (most are 0)
#   linear model on spend, same computation:   H²(fee, tenure) = 0.0000     <- additive by construction: the statistic knows`,
      caption: "H² answers 'how much of the joint effect of two features is not the sum of their separate effects', on a 0–1 scale. It is the quantitative version of the ICE fan, and it ranks pairs for the two-feature PDPs worth drawing. It is expensive — three partial dependences per pair, each a pass over the data — so compute it on a sample and for the candidate pairs the ICE curves point to; and note that it inherits the PDP's extrapolation problem on correlated pairs."
    },

    { t: "table",
      head: ["Method", "Answers", "Scope", "Assumes", "Fails when", "Cost"],
      rows: [
        ["Permutation importance", "Which features the model relies on", "Global", "Shuffling breaks only this feature's link", "Correlated features share credit; training-set version measures memorisation", "repeats × features × predict"],
        ["PDP", "The model's mean response as a feature varies", "Global", "The feature can vary independently of the rest", "Correlated inputs → impossible rows → extrapolation (slope 1.58 vs 2.0)", "grid × predict"],
        ["ICE", "Each row's response curve", "Global, per row", "Same as PDP", "Same; and clutter beyond a few hundred rows", "grid × predict"],
        ["ALE", "The accumulated local effect of a feature", "Global", "Effects are locally estimable from small moves", "Very few rows per bin; discontinuous features", "bins × 2 × predict on bin rows"],
        ["H-statistic", "How much two features interact", "Global, per pair", "PDP's assumption", "Correlated pairs; pairs × cost", "3 PDPs per pair"]
      ]
    },

    { t: "ladder",
      title: "Explaining a credit model's behaviour to a risk committee",
      rungs: [
        { level: "bad", label: "feature_importances_ bar chart and 'income matters most'", code: `pd.Series(model.feature_importances_).plot.barh()`,
          note: "**Impurity importance on training rows** — biased toward many-valued columns (a random id scored 0.175 in 6.1), silent about correlated groups, and no sense of direction or shape." },
        { level: "ok", label: "Permutation importance on held-out data with intervals; PDPs for the top features", code: `permutation_importance(model, X_holdout, y_holdout, scoring="roc_auc", n_repeats=30); PartialDependenceDisplay.from_estimator(model, X, top_features, kind="both")`,
          note: "**Honest reliance, with uncertainty, and the shape of each effect.** But income and debt-to-income are correlated, and the PDP at high income is averaging over impossible rows." },
        { level: "best", label: "Grouped permutation, ALE for correlated features, ICE for heterogeneity, H² for the pairs that matter, and the causal caveat in writing", code: `# groups = correlated clusters from the feature correlation matrix; permute groups
# ALE for any feature with |corr| > 0.5 to another; ICE + H² to find and show the interactions (income × age, say) as 2-D plots
# every plot captioned 'what the model does', with 9.2's local explanations for individual decisions and 11.7's caveat on causation`,
          note: "**A committee sees what the model relies on, how each input moves the score, where inputs interact, and what the plots cannot claim** — which is the whole of a global explanation." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Compute",
      title: "Importance by hand, an ALE by hand, and an interaction you must find",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "**(a)** For a model with hold-out AUC 0.72, five shuffles of feature A give AUCs 0.66, 0.65, 0.67, 0.64, 0.66 and five shuffles of feature B give 0.71, 0.72, 0.70, 0.72, 0.71. Compute both importances with their standard deviations, and say what 'B's importance is not distinguishable from zero' does and does not mean about B. **(b)** A feature x has rows at 1.0, 1.4, 1.9, 2.6, 3.1, 3.8 (two bins: [1.0, 1.9] and [1.9, 3.8]). A model's prediction rises by 0.4 when each row in the first bin has x moved from 1.0 to 1.9, and by 1.2 when each row in the second bin has x moved from 1.9 to 3.8. Compute the ALE at the bin edges, centre it, and give the implied slope in each bin. **(c)** On the spend model, compute the ICE slopes of `discount_pct` separately for fee < 10 and fee > 15, and H²(discount, fee) on a 300-row sample; state whether the interaction is present and why it is smaller than fee × tenure." }
      ],
      requirements: [
        "(a) two importances ± sd, and the interpretation.",
        "(b) the ALE values at the three edges, centred, and the two slopes.",
        "(c) two ICE slopes and the H², with the reason."
      ],
      hint: "(a) Importance = base − mean(shuffled). (b) ALE at edges = cumulative sum of the bin effects starting at 0; centre by subtracting the row-weighted mean. (c) Most rows have discount 0; an interaction can only show where the feature varies.",
      solution: {
        lang: "python",
        title: "global_explanation_practice.py",
        code: `# (a) base 0.72
#   A: shuffled mean 0.656 -> importance 0.064 ± 0.011 (sd of the five drops)     clearly relied on
#   B: shuffled mean 0.712 -> importance 0.008 ± 0.008                            within one sd of zero
#   'not distinguishable from zero' means THE MODEL does not lose measurable score without B on this hold-out set. It does not mean B is
#   unrelated to the target: B may be redundant with A (shuffle both together to find out), the model may have ignored a real signal,
#   or the hold-out set may be too small to see a 0.008 effect. Reliance, not relevance.

# (b) bin 1 [1.0, 1.9]: 3 rows, effect +0.4;   bin 2 [1.9, 3.8]: 3 rows, effect +1.2
#   uncentred ALE at the edges: x = 1.0 -> 0;  x = 1.9 -> 0.4;  x = 3.8 -> 1.6
#   centre: the row-weighted mean of the bin-level ALE values (each row takes its bin's accumulated value at the bin's right edge... by
#   convention the mean over rows of the interpolated ALE); using the bin right-edge values weighted by 3 and 3: mean = (0.4 + 1.6)/2 = 1.0
#   centred ALE: x = 1.0 -> -1.0;  x = 1.9 -> -0.6;  x = 3.8 -> +0.6
#   slopes: bin 1: 0.4 / 0.9 = 0.44 per unit;  bin 2: 1.2 / 1.9 = 0.63 per unit  -- the effect steepens; a PDP over the same range would
#   report one averaged slope and, with correlated inputs, a compressed one.

# (c) executed: ICE slope of discount (spend per percentage point), fee < 10: −0.95;  fee > 15: −2.10       H²(fee, discount) = 0.005 (lesson)
#   truth: discount's effect is −fee × min(tenure, 12) / 100 per point, i.e. about −0.9 at fee 8 and −2.0 at fee 17 for settled customers:
#   the interaction is present and in the direction of the product, and the ICE slopes recover it. H² is nonetheless small because
#   686 of 863 customers have discount = 0 and the rest take only 10 or 20, so the partial dependence over discount is nearly flat for most
#   rows and the joint variance the statistic normalises by is small. H² is a share of joint variance; a feature that barely varies
#   contributes little of it -- present, small, and correctly ranked below fee × tenure (0.034).`,
        notes: [
          { t: "p", text: "**(a)** separates reliance from relevance, which is the single most common misreading of an importance chart." },
          { t: "p", text: "**(b)** is the whole ALE algorithm on six rows: local differences, accumulated, centred. Nothing in it evaluates the model outside the data." },
          { t: "p", text: "**(c)** shows H² doing its job — ranking interactions — and its blind spot: a feature with little variation cannot show much interaction whatever the mechanism." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "On two features correlated at 0.9 the PDP recovered a slope of 1.58 where the true direct effect was 2.0, and ALE recovered 1.99. What went wrong with the PDP, and why did ALE not share the problem?",
          options: [
            "The PDP used too few grid points",
            "The PDP sets x₁ to each grid value for every row while leaving each row's own x₂, which at the ends of the grid produces thousands of (x₁, x₂) combinations the training data never contained — 74 % of rows more than 2 sd from x₂'s conditional mean at x₁ = 1.66 — and a tree model extrapolates flat there, compressing the averaged curve. ALE only asks how the prediction changes for small moves of x₁ within narrow bins of rows that already have that x₁, so every query stays inside the data",
            "ALE uses more data",
            "The model was underfitted"
          ],
          answer: 1,
          why: "With x₂ redrawn independently, both methods gave slope 2.0: the assumption, not the method, was the problem."
        }
      ]
    }
  ],

  takeaways: [
    "**Three axes**: intrinsic vs post-hoc, global vs local, agnostic vs specific. Post-hoc methods keep the accurate model; every one of them explains the model, not the world.",
    "**Permutation importance = held-out score drop when a column is shuffled**, with a spread from repeats (logins +0.095 ± 0.028); rank only where intervals separate.",
    "**Correlated features share credit**: fee +0.016 with the plan dummies at ≈ 0; permute the group (+0.018). Training-set importance measures memorisation (tenure 0.094 train vs 0.036 test).",
    "**PDP = the model's mean response as a feature is set to each grid value**; on churn, P(churn) 0.334 → 0.061 across the logins range.",
    "**PDP extrapolates on correlated inputs**: slope 1.58 vs truth 2.0 at corr 0.9, because 74 % of queried rows were impossible; **ALE** recovers 1.99 by accumulating local differences inside the data; both agree when inputs are independent.",
    "**ICE curves are the PDP before averaging**: fee's effect on spend is 4/£ for new customers and 12/£ for settled ones; the PDP's 11.2 is true of nobody.",
    "**H² quantifies an interaction**: 0.034 for fee × tenure, 0.005 for fee × discount, 0.000 for a linear model.",
    "**Check the correlation matrix before reading a PDP**; above ~0.5 use ALE; use ICE to find heterogeneity and H² to rank pairs.",
    "**Compute on held-out rows, report spreads, permute groups, caption every plot 'what the model does'.**",
    "**Importance is reliance, not relevance, and never causation** — a leaked column would top every chart."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "How is permutation importance computed, and what are its two main pitfalls?",
        options: [
          "Sum of impurity decreases over splits; pitfalls are speed and memory",
          "Shuffle one column on held-out data, rescore in the chosen metric, and take the drop, repeated for a spread (logins: five shuffles 0.100–0.123). Pitfalls: correlated features share credit so each looks unimportant while the group matters (permute groups together), and computing on training rows measures memorisation rather than reliance (forest tenure: 0.094 train vs 0.036 test)",
          "Refit the model without each feature; pitfalls are cost and instability",
          "Take the model's coefficients; pitfalls are scaling and sign"
        ],
        answer: 1,
        why: "It is model-agnostic and metric-aware, which is why it is the default global importance."
      },
      {
        stem: "What does a partial dependence plot show, and what does it assume?",
        options: [
          "The correlation between a feature and the target",
          "The model's average prediction when a feature is set to each grid value for every row, other features left at their own values — the model's mean response curve, in prediction units (P(churn) 0.334 at 4 logins, 0.061 at 20). It assumes the feature can be varied independently of the others; when they are correlated the construction creates rows outside the data and the curve becomes extrapolation",
          "The feature's marginal distribution",
          "The model's prediction for the average row"
        ],
        answer: 1,
        why: "An odds ratio (4.5) makes the same 'holding others fixed' assumption; the PDP just makes it visible for non-linear models."
      },
      {
        stem: "When would you use ALE instead of PDP, and how does it work?",
        options: [
          "ALE is faster, so always",
          "When features are correlated (check the matrix; above ~0.5). ALE bins the feature, and within each bin measures the mean change in prediction when the rows already in that bin have the feature moved from the bin's lower to upper edge; the bin effects are accumulated and centred. Every query is a small move inside the data, so no impossible rows are created — slope 1.99 against the PDP's 1.58 on inputs correlated at 0.9",
          "When the model is linear",
          "When there are fewer than 100 rows"
        ],
        answer: 1,
        why: "ALE's cost is bins × 2 predictions on bin rows; its weakness is bins with too few rows."
      },
      {
        stem: "The PDP says a pound of monthly fee is worth 11.2 of annual spend; ICE curves show 4.0 for new customers and 12.1 for settled ones. Which is right?",
        options: [
          "The PDP; it averages out noise",
          "The ICE curves: the fee's effect depends on tenure (spend = fee × min(tenure, 12) × …), so the average slope describes no actual customer. Diverging ICE curves are the definition of an interaction; the H-statistic quantifies it (0.034 for fee × tenure) and a two-feature PDP or ALE shows it. Always plot ICE alongside the PDP (kind='both')",
          "Neither; the model is wrong",
          "The PDP for reporting, ICE for debugging only"
        ],
        answer: 1,
        why: "An average of heterogeneous effects is a number with no referent."
      },
      {
        stem: "A stakeholder reads 'support tickets are the third most important feature' as 'reducing tickets will reduce churn'. What do you say?",
        options: [
          "That is correct; importance measures effect",
          "That importance measures what the model relies on, not what causes the outcome: tickets could be a symptom of dissatisfaction that causes both, and a leaked post-outcome column (1.5's refunds) would rank first while being an effect of churn. The plot is a statement about the model; a causal claim needs a design or the methods of 11.7. What the chart licenses is 'customers with more tickets are predicted to churn more'",
          "That tickets are less important than logins so it does not matter",
          "That the PDP would answer the causal question"
        ],
        answer: 1,
        why: "Every explanation in this module carries the same caption: 'the model believes'."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How would you explain what a black-box model does, globally, to a non-technical audience?",
        strong: "With three post-hoc tools, each captioned as a statement about the model. First, which inputs it relies on: permutation importance on held-out data, computed as the drop in the business metric when each column is shuffled, repeated to get a spread — on the churn model logins cost 0.095 of AUC with a spread of 0.028, tenure 0.061, and the bottom features were indistinguishable from zero. I permute correlated columns as a group, because fee and plan tier share one piece of information and shuffling either alone understates it. Second, how each important input moves the prediction: partial dependence curves in the units of the decision — the model's churn probability falls from 33 % at four logins to 6 % at twenty — with individual curves overlaid so that an interaction shows as a fan, as it did for the fee's effect on spend, 4 per pound for new customers and 12 for settled ones. Where inputs are correlated I use accumulated local effects instead, because a partial dependence curve then averages the model over combinations that never occur and understated a true slope of 2.0 as 1.58. Third, which inputs interact, with the H-statistic ranking the pairs. And on every chart the caption says what the model does, not what causes the outcome, because a leaked column would top the importance chart while being an effect rather than a cause.",
        answer: [
          { t: "p", text: "Importance with spreads and groups, PDP/ICE/ALE with the numbers, H² for pairs, and the causal caption." }
        ]
      },
      {
        level: "core",
        q: "Permutation importance versus impurity importance versus coefficients — when is each appropriate?",
        strong: "Coefficients are intrinsic: for a linear or logistic model on standardised features they are exact, signed, and come with intervals, and they are the explanation of choice when the model is linear — with the collinearity caveat from 4.5, where fee and plan flipped each other's signs. Impurity importance is the tree ensemble's built-in score: fast, computed on the training rows, and biased toward columns with many distinct values because such columns always offer a split that purifies some small node — a random id ranked third in a churn forest. Permutation importance is model-agnostic and metric-aware: shuffle a column on held-out data and measure the score drop, so it reflects reliance on data the model has not memorised, in the metric that matters; its costs are compute — repeats times features times a prediction pass — and the correlated-feature problem, where shuffling one of two redundant columns leaves the information available through the other, which is solved by permuting groups. So: coefficients for linear models, permutation importance on held-out data as the default for everything else, and impurity importance only as a quick training-time diagnostic that is never reported.",
        answer: [
          { t: "p", text: "Three methods, their mechanisms, their failure modes with course numbers, and the rule." }
        ]
      },
      {
        level: "advanced",
        q: "A PDP shows that a model's predicted default risk falls as income rises above £150k, then rises again. A stakeholder wants to know whether high earners are really riskier. Respond.",
        strong: "First I would ask what the data look like above £150k: usually very few rows, and rows whose other features — loan size, debt ratio, age — are strongly tied to income. A PDP at £200k sets income to £200k for every row while leaving each row's own loan size and debt ratio, which produces thousands of combinations that never occur — a £200k earner with a £5k loan and a 60 % debt ratio — and the model's prediction there is extrapolation, flat for a tree ensemble and confidently wrong for a linear one; on two features correlated at 0.9 a PDP compressed a true slope of 2.0 to 1.58 by exactly this mechanism. So I would recompute the curve as accumulated local effects, which asks only how the prediction changes for small income moves among rows that actually have that income, and I would overlay the individual curves to see whether the upturn is a few rows or a pattern. If the upturn survives ALE and ICE, the model does predict higher risk for some high earners — and the next question is why: an interaction with loan size, which the H-statistic and a two-feature plot would show, or a data artefact such as self-employed applicants whose income is recorded differently. And the answer to 'are they really riskier' is that the model believes so under those conditions; whether it is true, and whether it is fair to act on, is a question about the data and the policy, not about the plot.",
        answer: [
          { t: "p", text: "Diagnose the extrapolation, replace with ALE and ICE, look for the interaction or artefact, and separate the model's belief from the world's truth." }
        ]
      }
    ]
  }
});

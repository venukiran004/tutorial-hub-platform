/* ============================================================================
   LESSON 9.2 — SHAP, LIME, Anchors and Counterfactuals
   ========================================================================= */
EC.receiveLesson({
  id: "9.2",

  lede: "**'Why did the model say this about this customer?' has four kinds of answer: a fair division of the prediction among the features (SHAP), a simple model that mimics the black box nearby (LIME), a rule that guarantees the prediction (an anchor), and the smallest change that would reverse it (a counterfactual).** This lesson builds each one and checks it. Shapley values are derived from the axioms and computed by hand over every coalition for a three-feature model — φ = (1.75, 0.50, 0.75), summing exactly to the prediction minus the baseline, and matching `shap` to four decimals; TreeSHAP then explains 297 churn customers in 14 ms, KernelSHAP needs 500 model calls per row to get within 0.03 of the exact answer, and a linear model's SHAP values are just coefficient × deviation. LIME's surrogate agrees with SHAP on the top two features and reorders the rest across seeds; the anchor search finds that no short rule holds this customer's prediction at 95 % precision, which is itself the finding; and the cheapest counterfactual — one more login a month — takes the customer from 0.61 to 0.49. The close is the comparison every interviewer asks for: SHAP against LIME, and when each is the wrong tool.",

  objectives: [
    "Derive Shapley values from the four axioms and compute them by hand over coalitions; state what the baseline and the value function mean",
    "Use TreeSHAP, KernelSHAP and LinearSHAP appropriately, read waterfall, summary and dependence plots, and know the cost of each explainer",
    "Fit a LIME surrogate, measure its fidelity and its instability, and contrast it with SHAP",
    "Search for an anchor and a counterfactual, judge them by precision, coverage, proximity and actionability, and know when each fails"
  ],

  prerequisites: ["9.1", "6.4", "4.5"],

  blocks: [

    { t: "h2", n: "01", text: "Shapley values: a fair division of the prediction", id: "shapley" },

    { t: "code", lang: "text", title: "The axioms, the formula, and a three-feature computation over every coalition (executed)",
      code: `a prediction f(x) is a 'payout'; the features are 'players'; φⱼ is feature j's share. Four axioms determine it uniquely:
   efficiency   Σⱼ φⱼ = f(x) − E[f]           the shares add up to the prediction minus the baseline
   symmetry     equal contributors get equal shares          dummy   a feature that never changes anything gets 0          linearity   φ(f + g) = φ(f) + φ(g)

φⱼ = Σ_{S ⊆ N∖{j}}  |S|! (|N| − |S| − 1)! / |N|!  ·  [ v(S ∪ {j}) − v(S) ]        the average marginal contribution of j over every order the features could be 'added'
v(S) = the model's expected output with the features in S fixed at x's values and the rest drawn from a background distribution

model  f(x) = 2x₁ + x₂ + 3x₁x₃         background rows (0,0,0), (1,0,1), (0,1,0), (1,1,1)         explain x = (1, 1, 1):  f(x) = 6,  baseline v(∅) = 3

feature x₁, the four coalitions of the other two:
   S = ∅        weight 2!0!/3! = 1/3      v({1}) − v(∅)          = 4.000 − 3.000 = +1.000
   S = {x₂}     weight 1!1!/3! = 1/6      v({1,2}) − v({2})      = 4.500 − 3.500 = +1.000
   S = {x₃}     weight 1/6                v({1,3}) − v({3})      = 5.500 − 3.000 = +2.500      <- with x₃ present, x₁'s interaction term switches on
   S = {x₂,x₃}  weight 1/3                v({1,2,3}) − v({2,3})  = 6.000 − 3.500 = +2.500
   φ₁ = (1/3)(1.0) + (1/6)(1.0) + (1/6)(2.5) + (1/3)(2.5) = 1.750
likewise  φ₂ = 0.500,  φ₃ = 0.750.        Σφ = 3.000 = f(x) − baseline = 6 − 3.        shap.KernelExplainer, same background: [1.75, 0.5, 0.75], expected_value 3.0`,
      caption: "The interaction term 3x₁x₃ is split between x₁ and x₃ — 1.5 of it to x₁'s 1.75 and 0.75 of it to x₃'s total — because in half of the orderings each is the one that 'completes' the pair. That is what the weights do: they average over every order in which features could enter, so no feature is credited or blamed for being first. The baseline is the model's average output over the background; it is a modelling choice (training data, a reference group, a single reference row), and every SHAP value is relative to it."
    },

    { t: "dl", items: [
      ["Value function v(S)", "The expected model output with S fixed to the explained row. Interventional (features outside S drawn independently from the background) or observational (drawn conditionally); interventional is the default and avoids extrapolation less than it sounds — 9.1's PDP caveat applies."],
      ["Baseline E[f]", "v(∅): the mean prediction over the background. SHAP values sum to f(x) − E[f]; change the background and every value changes."],
      ["TreeSHAP", "Exact Shapley values for tree ensembles in polynomial time by walking the trees once per row. Log-odds scale for classifiers by default; 297 rows in 14 ms."],
      ["KernelSHAP", "Model-agnostic: sample coalitions, evaluate the model with unselected features replaced by background rows, fit a weighted linear regression whose coefficients are the Shapley estimates. Hundreds of model calls per row."],
      ["LinearSHAP", "For a linear model φⱼ = βⱼ(xⱼ − x̄ⱼ) exactly — the coefficient times the deviation from the background mean."],
      ["LIME", "Perturb the row, weight perturbations by proximity, fit a sparse linear (or discretised) surrogate; its coefficients are the explanation. Local, agnostic, stochastic."],
      ["Anchor", "An if-then rule on the row's feature values such that the prediction holds with high precision (≥ τ) for rows satisfying it; coverage is the share of rows the rule applies to."],
      ["Counterfactual", "The nearest row x′ with a different prediction: argmin d(x, x′) s.t. f(x′) ≠ f(x); judged by validity, proximity, sparsity, plausibility, actionability, diversity."]
    ]},

    { t: "h2", n: "02", text: "SHAP on the churn model", id: "shap" },

    { t: "code", lang: "python", title: "TreeSHAP for one customer and for the population (executed; HistGradientBoosting, 30 % hold-out)",
      hl: [2, 4, 5, 6, 8, 10, 12],
      code: `explainer = shap.TreeExplainer(model); S = explainer.shap_values(X_test)          # 297 × 12 values in 14 ms; log-odds scale; base value −1.971 (= logit of the mean prediction)
# the highest-risk customer: tenure 2 months, fee 7.26, 4 logins, 2 tickets, no discount -> P(churn) 0.611, log-odds +0.452
#   logins_30d       +1.082      <- four logins a month: the largest push toward churn
#   tenure_months    +0.932
#   support_tickets  +0.323
#   monthly_fee      +0.135
#   channel_paid     −0.077      <- not a paid-channel customer: slightly protective
#   region_south     +0.058
#   base −1.971 + Σφ 2.423 = 0.452 = the model's log-odds exactly (efficiency)

# global view -- mean |φ| over the 297 rows:  logins 0.527   tenure 0.472   fee 0.221   channel_paid 0.167   tickets 0.116   region_south 0.055
# dependence -- the logins SHAP value by logins:   <= 5: +0.817      6-12: +0.259      >= 13: −0.796      <- the feature's shape, from local values`,
      caption: "One table serves three plots. The per-row values are the *waterfall*: how the base rate became this customer's 0.61, feature by feature, in units that add. The mean absolute value per feature is the *summary* — a global importance that is derived from local explanations, consistent with 9.1's permutation ranking (logins, tenure first) and additive. The values plotted against the feature are the *dependence* plot, which recovers the PDP's shape without the PDP's extrapolation, because every value belongs to a real row."
    },

    { t: "viz",
      title: "The waterfall for the highest-risk customer (executed values, log-odds)",
      caption: "From the base value −1.971 (a churn probability of 12 %) each feature pushes the log-odds; the bars sum to +2.423 and land at +0.452, a probability of 0.61. Four logins and two months of tenure do most of the work.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="A waterfall chart from a base value of minus 1.971 on the left to a final value of plus 0.452 on the right, with positive bars for logins (+1.082), tenure (+0.932), tickets (+0.323), fee (+0.135), a negative bar for channel_paid (−0.077), and a small positive bar for region_south (+0.058).">
  <g style="stroke:var(--line)" stroke-width="1"><line x1="80" y1="250" x2="840" y2="250"/><line x1="80" y1="40" x2="80" y2="250"/></g>
  <g class="s-sub">
    <text x="72" y="254" text-anchor="end">−2.0</text><text x="72" y="184" text-anchor="end">−1.0</text><text x="72" y="114" text-anchor="end">0</text><text x="72" y="44" text-anchor="end">+1.0</text>
    <text x="440" y="292" text-anchor="middle">log-odds of churn, feature by feature</text>
  </g>
  <line x1="80" y1="114" x2="840" y2="114" style="stroke:var(--line)" stroke-width="1" stroke-dasharray="3 5"/>
  <rect x="100" y="245" width="60" height="3" style="fill:var(--ink-3)"/><text x="130" y="270" class="s-sub" text-anchor="middle">base −1.971</text>
  <rect x="190" y="172" width="70" height="76" style="fill:var(--crit)"/><text x="225" y="166" class="s-sub" text-anchor="middle">logins +1.08</text>
  <rect x="290" y="107" width="70" height="65" style="fill:var(--crit)"/><text x="325" y="101" class="s-sub" text-anchor="middle">tenure +0.93</text>
  <rect x="390" y="84" width="70" height="23" style="fill:var(--crit)"/><text x="425" y="78" class="s-sub" text-anchor="middle">tickets +0.32</text>
  <rect x="490" y="75" width="70" height="9" style="fill:var(--crit)"/><text x="525" y="69" class="s-sub" text-anchor="middle">fee +0.14</text>
  <rect x="590" y="75" width="70" height="5" style="fill:var(--accent)"/><text x="625" y="97" class="s-sub" text-anchor="middle">channel −0.08</text>
  <rect x="690" y="76" width="70" height="4" style="fill:var(--crit)"/><text x="725" y="70" class="s-sub" text-anchor="middle">region +0.06</text>
  <rect x="790" y="81" width="40" height="3" style="fill:var(--ink)"/><text x="810" y="102" class="s-sub" text-anchor="middle">+0.452</text>
  <text x="640" y="230" class="s-label" style="font-weight:600">P(churn) 0.12 → 0.61</text>
</svg>`
    },

    { t: "code", lang: "python", title: "Which explainer, at what cost (executed)",
      hl: [2, 3, 5, 7, 8],
      code: `#   explainer                           exact?     cost                                      result on the churn data
#   TreeExplainer (tree ensembles)      yes        one tree walk per row                     297 rows in 14 ms
#   KernelExplainer (any model)         no         nsamples model calls per row              20 rows × 500 samples in 0.2 s; max error vs exact 0.029 on log-odds of magnitude 1.4
#                                                                                            (5,000 rows at this rate: about a minute; with a slower model, hours)
#   LinearExplainer (linear models)     yes        one multiplication                        φⱼ = βⱼ (zⱼ − z̄ⱼ): tenure 1.26, logins 1.16, tickets 0.44, channel_paid −0.27 for the same customer
#   by hand for the linear model, coefficient × standardised deviation:  tenure 1.262, logins 1.158 -- LinearExplainer gives 1.316, 1.103: the difference is the background
#   (a 100-row sample vs the full training mean). Change the background, change every value.`,
      caption: "For trees, SHAP is exact and nearly free, which is why it has become the default explanation for boosted models. For anything else KernelSHAP samples coalitions, and its error and cost are set by `nsamples`; 500 got within 0.03 here, and each row costs 500 model evaluations. The linear case is a reminder of what SHAP values are — for a model without interactions, feature j's contribution is just how far its value sits from the background, times its weight — and of how much the background choice matters."
    },

    { t: "h2", n: "03", text: "LIME: a local surrogate, and its variance", id: "lime" },

    { t: "code", lang: "python", title: "LIME on the same customer, five random seeds (executed; 2,000 perturbations, 5 features, discretised)",
      hl: [3, 4, 6, 7],
      code: `LimeTabularExplainer(X_train, discretize_continuous=True).explain_instance(x, model.predict_proba, num_features=5, num_samples=2000)
#   seed   top-3 features of the surrogate
#   0      logins_30d <= 7.00      tenure_months <= 16.00     support_tickets > 1.00
#   1      tenure_months <= 16.00  logins_30d <= 7.00         support_tickets > 1.00     <- the top two swap
#   2      logins_30d <= 7.00      tenure_months <= 16.00     support_tickets > 1.00
#   3      logins_30d <= 7.00      tenure_months <= 16.00     channel_paid <= 0.00       <- third place changes feature
#   4      logins_30d <= 7.00      tenure_months <= 16.00     channel_paid <= 0.00
#   weight ranges across the five seeds:  logins 0.130-0.141    tenure 0.123-0.131    tickets 0.040-0.068    channel_paid −0.047 to −0.043
#   surrogate fidelity (R² on its own weighted perturbations): 0.546`,
      caption: "LIME agrees with SHAP about what matters most for this customer — logins and tenure — and disagrees with itself about the order and the tail, because its explanation is a regression on random perturbations. The 0.546 fidelity says the local linear surrogate captures about half of the black box's variation in the neighbourhood; the rest is what the interaction-bearing model does that a line cannot. Both numbers must be reported with a LIME explanation: the spread across seeds, and the fidelity."
    },

    { t: "table",
      head: ["", "SHAP", "LIME"],
      rows: [
        ["Basis", "Shapley values: axioms, unique solution", "Local surrogate: perturb, weight, fit"],
        ["Guarantee", "Efficiency (values sum to f(x) − E[f]), consistency", "Local fidelity only, and only as measured"],
        ["Determinism", "TreeSHAP exact; KernelSHAP has sampling variance", "Stochastic: top-3 changed in 2 of 5 seeds"],
        ["Units", "Model output (log-odds or probability), additive", "Surrogate coefficients on discretised features"],
        ["Global from local", "Yes: mean |φ|, dependence plots", "No natural aggregation"],
        ["Interactions", "SHAP interaction values (TreeSHAP)", "Not represented"],
        ["Cost", "Trees: negligible; agnostic: nsamples calls per row", "num_samples calls per row (2,000 here)"],
        ["Correlated features", "Interventional vs observational choice; extrapolation risk in KernelSHAP's perturbations", "Perturbs features independently: same risk"],
        ["Prefer when", "Tree models; rigour; population views; audit", "A quick intuitive story; text/images via superpixels; a model with no SHAP explainer"]
      ]
    },

    { t: "h2", n: "04", text: "Anchors and counterfactuals", id: "anchors" },

    { t: "code", lang: "python", title: "Searching for an anchor: a rule that keeps the prediction 'high risk' (P ≥ 0.35) with high precision (executed)",
      hl: [3, 5, 6, 7, 9],
      code: `# predicates true for this customer: logins <= 5, tenure <= 6, tickets >= 2, channel_paid == 0, plan_pro == 0, fee <= 8     (10.8 % of training rows are high risk)
# precision of a rule = share of training rows satisfying it that the model also calls high risk; coverage = share of rows it applies to
#   logins <= 5                                precision 0.430   coverage 0.114
#   tenure <= 6                                precision 0.286   coverage 0.091
#   logins <= 5  AND  tenure <= 6              precision 0.857   coverage 0.010
#   tenure <= 6  AND  tickets >= 2             precision 0.800   coverage 0.014
#   logins <= 5 AND tickets >= 2 AND fee <= 8  precision 0.700   coverage 0.014
# no rule of up to three of these predicates reaches 95 % precision; the best two-predicate rule holds 86 % of the time on 1 % of customers`,
      caption: "An anchor is the explanation a policy wants — 'customers with fewer than six logins and under six months' tenure are flagged' — and it comes with the two numbers a policy needs: how often the rule is right (precision) and how many it covers. On a noisy target it also comes with an honest failure: no short rule guarantees this model's prediction, because the prediction depends on a combination no two or three predicates capture. The libraries (alibi's AnchorTabular) search the same space with a bandit over perturbed samples; the result on weak signal is long rules with tiny coverage, and reporting that is better than reporting a rule that does not hold."
    },

    { t: "code", lang: "python", title: "The nearest counterfactual, restricted to actionable features (executed)",
      hl: [2, 3, 5],
      code: `# start: P(churn) 0.611.  Actionable: logins_30d (engagement can be nudged), support_tickets (issues can be resolved). Not actionable: tenure, plan, region.
#   smallest standardised change that takes P below 0.5:   +1 login per month, 0 tickets   ->  P = 0.494     (cost 0.20 sd-units)
#   alternatives:   +10 logins -> 0.202       −2 tickets -> 0.470       +5 logins and −1 ticket -> 0.301
# the cheapest flip sits at the decision boundary (0.494): valid, proximate, sparse -- and fragile. A retention action wants the +5/−1 row: further from the edge`,
      caption: "A counterfactual turns an explanation into an action, which is why it must be constrained to features someone can change and to changes that are plausible — no counterfactual should propose negative tenure or a plan the customer cannot buy. The nearest flip is usually a hair over the boundary, so 'diverse' counterfactuals at different distances (DiCE generates a set) are more useful than the single closest one. And the caveat of 9.1 returns doubled: the counterfactual says what would change the *model's* output, and the model is not a causal model of the customer."
    },

    { t: "callout", kind: "tradeoff", title: "Four questions, four tools", body: [
      { t: "p", text: "**How much did each feature contribute to this prediction?** SHAP — additive, exact for trees, aggregates to a global view. **What simple story fits the model near this row?** LIME — fast to understand, report its seed spread and fidelity. **Under what rule does the model keep saying this?** An anchor — precision and coverage attached, and an honest 'none short enough' on noisy targets. **What would have to change?** A counterfactual — restricted to actionable, plausible moves, offered as a diverse set. For a regulated decision the usual package is SHAP for the file, a counterfactual for the customer, and an anchor for the policy team; LIME is the sketch on the whiteboard." }
    ]},

    { t: "ladder",
      title: "Explaining a declined loan to the applicant and to the regulator",
      rungs: [
        { level: "bad", label: "'The model said no' — or the LIME top feature from one run", code: `lime.explain_instance(x, model.predict_proba).as_list()[0]`,
          note: "**One stochastic sketch, no fidelity, no units, and a third-place feature that changes with the seed.** Neither audience can act on it." },
        { level: "ok", label: "SHAP waterfall on the file; counterfactual for the applicant", code: `shap.TreeExplainer(model).shap_values(x)     # additive, exact, log-odds -> probability
dice.generate_counterfactuals(x, total_CFs=3, features_to_vary=["income", "debt", "term"])`,
          note: "**Exact attribution for the regulator, an actionable path for the applicant.** Missing: what the model does for people *like* this applicant, and plausibility checks on the counterfactuals." },
        { level: "best", label: "SHAP with a stated baseline, an anchor for the policy, diverse plausible counterfactuals, and the causal caveat", code: `# baseline = the approved population (so 'relative to approved applicants'); waterfall in probability units
# anchor with precision/coverage for the adverse-action reason codes; counterfactuals constrained to actionable, in-range features, three at different distances
# the letter says: these factors weighed against you (SHAP), applicants meeting this rule are approved 9 times in 10 (anchor), and these changes would qualify (counterfactuals)`,
          note: "**An explanation with a stated reference point, a guaranteed rule, actionable paths, and no claim that the model knows what causes default.**" }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Compute",
      title: "Shapley values by hand for a model with an interaction, then the exact linear case",
      difficulty: "advanced",
      minutes: 34,
      body: [
        { t: "p", text: "**(a)** For f(x) = 4x₁ + 2x₁x₂ with background rows (0, 0), (1, 0), (0, 1), (1, 1) and the explained row x = (1, 1), compute v(∅), v({1}), v({2}), v({1, 2}), then φ₁ and φ₂, and verify efficiency. Explain in a sentence why x₂ gets a non-zero share although it has no main effect. **(b)** For a logistic model with standardised coefficients β = (1.2, −0.8, 0.5) and a background mean of zero, compute the SHAP values for z = (0.5, 1.0, −2.0) and the prediction's log-odds relative to the baseline. **(c)** Using the churn boosting model, compute the SHAP values of the customer with the *lowest* predicted risk and compare the top features with the highest-risk customer's; then explain why the mean |φ| ranking (logins, tenure, fee) differs from 9.1's permutation ranking (logins, tenure, tickets) for the third place." }
      ],
      requirements: [
        "(a) four coalition values, two Shapley values, the efficiency check, and the sentence.",
        "(b) three SHAP values and their sum.",
        "(c) the low-risk customer's top features and the third-place explanation."
      ],
      hint: "(a) v(S) fixes the features in S to x's values and averages f over the background for the rest. (b) φⱼ = βⱼ(zⱼ − z̄ⱼ). (c) mean |φ| measures typical contribution size; permutation measures score loss — a feature can contribute consistently without the score depending on it much.",
      solution: {
        lang: "python",
        title: "shap_practice.py",
        code: `# (a) f = 4x₁ + 2x₁x₂;  background (0,0), (1,0), (0,1), (1,1);  x = (1, 1)
#   v(∅)     = mean f over background = (0 + 4 + 0 + 6)/4 = 2.5
#   v({1})   = x₁ fixed at 1, x₂ from background {0, 0, 1, 1}: mean(4, 4, 6, 6) = 5.0
#   v({2})   = x₂ fixed at 1, x₁ from background {0, 1, 0, 1}: mean(0, 6, 0, 6) = 3.0
#   v({1,2}) = f(1, 1) = 6.0
#   φ₁ = ½ [v({1}) − v(∅)] + ½ [v({1,2}) − v({2})] = ½(2.5) + ½(3.0) = 2.75
#   φ₂ = ½ [v({2}) − v(∅)] + ½ [v({1,2}) − v({1})] = ½(0.5) + ½(1.0) = 0.75
#   efficiency: 2.75 + 0.75 = 3.5 = f(x) − v(∅) = 6 − 2.5.  ✓
#   x₂ has no main effect, but it switches x₁'s interaction term on: in the orderings where x₂ arrives after x₁ it adds 1.0, and even
#   when it arrives first it raises the expected value (v({2}) > v(∅)) because the background has x₁ = 1 half the time. The interaction
#   is shared, as the symmetry axiom requires.

# (b) φ = β ⊙ (z − 0) = (1.2 × 0.5, −0.8 × 1.0, 0.5 × −2.0) = (0.6, −0.8, −1.0);   Σφ = −1.2 = the log-odds relative to the baseline.
#   the third feature, with the smallest coefficient, contributes most for THIS row because its value is the most unusual.

# (c) executed: the lowest-risk customer -- P(churn) 0.014; tenure 30, fee 20.03 (pro plan), 17 logins, 0 tickets
#   top contributions:  logins −1.033    monthly_fee −0.742    channel_paid −0.193    region_south −0.118    support_tickets −0.114
#   logins dominates at both ends (+1.08 for the riskiest, −1.03 here); the second feature differs: two months of tenure for the riskiest,
#   a pro-plan fee for the safest. The same model, the same features, a different story per row -- that is what a local explanation is for.
#   third place: mean |φ| ranks fee (0.221) above tickets (0.116) because fee encodes plan tier and moves EVERY customer's log-odds by a
#   plan-sized amount, while tickets move most customers by about 0.1 (|φ| 0.13 for the 40 % with no tickets, 0.11 for the rest).
#   Permutation importance ranks tickets above fee because shuffling fee is partly compensated by the plan dummies (9.1's group effect)
#   while tickets has no substitute. One measures typical contribution size; the other measures unique score dependence. Both are right.`,
        notes: [
          { t: "p", text: "**(a)** is the whole of Shapley attribution at the smallest size that shows an interaction being shared." },
          { t: "p", text: "**(b)** is the exact case: for a linear model SHAP adds nothing to the coefficients except the deviation from the baseline — which is precisely what makes a single row's explanation differ from the global one." },
          { t: "p", text: "**(c)** reconciles two importance rankings that disagree at third place, which happens constantly and means something each time." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "For f = 2x₁ + x₂ + 3x₁x₃ at x = (1, 1, 1), the Shapley value of x₃ is 0.75 although x₃ has no term of its own. Why?",
          options: [
            "Because x₃ is correlated with x₁ in the background",
            "Because the interaction 3x₁x₃ needs both features and the Shapley weights average over every order of arrival: when x₃ arrives after x₁ it switches the term on and is credited for it, and the symmetry axiom shares the interaction between the two — 1.5 to x₁, 0.75 to x₃, given the background's mix",
            "Because of sampling error in KernelSHAP",
            "Because SHAP values are always positive"
          ],
          answer: 1,
          why: "The by-hand computation and shap agreed to four decimals: interactions are shared, not assigned."
        }
      ]
    }
  ],

  takeaways: [
    "**Shapley values are the unique attribution satisfying efficiency, symmetry, dummy and linearity**: the average marginal contribution over every order of arrival, relative to a baseline that is a modelling choice.",
    "**By hand**: φ = (1.75, 0.50, 0.75) for 2x₁ + x₂ + 3x₁x₃ at (1, 1, 1), summing to 3.0 = f(x) − E[f]; shap matched exactly.",
    "**TreeSHAP is exact and cheap** (297 rows in 14 ms, log-odds); **KernelSHAP** samples coalitions (500 calls per row to get within 0.03); **LinearSHAP** is βⱼ(xⱼ − x̄ⱼ).",
    "**One table, three plots**: waterfall (base −1.971 → +0.452 for the highest-risk customer), summary (mean |φ|: logins 0.527, tenure 0.472), dependence (logins ≤ 5: +0.82; ≥ 13: −0.80).",
    "**Change the background, change every value** (1.262 vs 1.316 for the same feature with two backgrounds).",
    "**LIME** fits a weighted sparse surrogate to perturbations: agreed with SHAP on the top two, reordered them in one seed of five, changed third place in two, fidelity 0.55. Report the spread and the fidelity.",
    "**Anchors** attach precision and coverage to a rule; on the churn target no rule of up to three predicates reached 95 % (best: logins ≤ 5 ∧ tenure ≤ 6, 0.857 on 1 %). Reporting 'none' is the honest result.",
    "**Counterfactuals** are actions: +1 login flips 0.611 → 0.494 at the boundary; +5 logins and −1 ticket → 0.301 is the robust one. Restrict to actionable, plausible features; offer a diverse set.",
    "**SHAP for the file, counterfactuals for the person, anchors for the policy, LIME for the whiteboard.**",
    "**All four explain the model, not the customer** — the causal caveat of 9.1 applies to every one."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "State the Shapley value formula in words and the four axioms it satisfies.",
        options: [
          "The coefficient of each feature in a local linear fit; the axioms are linearity, sparsity, locality, fidelity",
          "Feature j's value is its marginal contribution v(S ∪ {j}) − v(S) averaged over all subsets S of the other features, weighted so that every order of arrival counts equally (|S|!(n − |S| − 1)!/n!). Efficiency: the values sum to f(x) − E[f]. Symmetry: interchangeable features get equal values. Dummy: a feature that changes nothing gets zero. Linearity: values for a sum of models are the sum of values",
          "The feature's partial dependence at the row's value; the axioms are independence, additivity, monotonicity, boundedness",
          "The permutation importance restricted to one row"
        ],
        answer: 1,
        why: "Uniqueness is what makes SHAP an attribution rather than a heuristic: no other additive split satisfies all four."
      },
      {
        stem: "When do you use TreeSHAP, KernelSHAP and LinearSHAP, and what does each cost?",
        options: [
          "TreeSHAP for any model; the others are deprecated",
          "TreeSHAP for tree ensembles — exact, one tree walk per row (297 rows in 14 ms); LinearSHAP for linear models — exact, βⱼ(xⱼ − x̄ⱼ); KernelSHAP for anything else — an approximation from sampled coalitions with nsamples model calls per row (500 gave error 0.03 here; a slow model makes it hours). Match the explainer to the model, and choose the background deliberately for all three",
          "KernelSHAP always, because it is model-agnostic",
          "LinearSHAP for trees after linearising them"
        ],
        answer: 1,
        why: "The model-specific explainers are exact and fast because they use the model's structure; the agnostic one pays for ignorance."
      },
      {
        stem: "Compare SHAP and LIME for explaining one prediction.",
        options: [
          "They are equivalent; LIME is the older name",
          "SHAP attributes the prediction additively by Shapley values with axiomatic guarantees, is exact for trees and aggregates to global views; LIME fits a stochastic local surrogate whose coefficients are the explanation, with fidelity that must be measured (0.55 here) and results that vary across seeds (top-3 changed in two of five runs). SHAP for rigour, audit and trees; LIME for a quick story, text and images via superpixels, or models without a SHAP explainer — always with its seed spread and fidelity reported",
          "LIME is exact; SHAP is an approximation",
          "SHAP is only for global explanations; LIME only for local"
        ],
        answer: 1,
        why: "They agreed on what mattered most for the customer and disagreed on the rest, which is the usual relationship."
      },
      {
        stem: "What makes an anchor useful, and what did the search on the churn model find?",
        options: [
          "An anchor is the feature with the largest SHAP value",
          "An anchor is an if-then rule on the row's values under which the prediction holds with high precision, reported with its coverage — the form a policy can adopt. On the churn model no rule of up to three predicates reached 95 % precision: the best (logins ≤ 5 and tenure ≤ 6) held 86 % of the time on 1 % of customers. Reporting that is more useful than a rule that does not hold; anchors work best where the model's decisions are crisp",
          "Anchors are counterfactuals with two features",
          "The search found that logins alone anchor the prediction at 43 % precision, which is sufficient"
        ],
        answer: 1,
        why: "Precision and coverage are the two numbers a rule needs; a rule without them is a slogan."
      },
      {
        stem: "What are the properties of a good counterfactual, and which did the nearest one on the churn model lack?",
        options: [
          "Only validity: it must flip the prediction",
          "Validity (flips the prediction), proximity (small change), sparsity (few features), plausibility (a real row could look like this), actionability (features the person can change), diversity (several options). The nearest flip — one extra login, 0.611 → 0.494 — is valid, proximate and sparse but fragile, sitting at the boundary; the +5 logins and −1 ticket option at 0.301 is the one a retention team would act on. Tenure and plan were excluded as non-actionable",
          "Diversity only; one counterfactual is never enough",
          "The nearest one was ideal because it changed one feature"
        ],
        answer: 1,
        why: "DiCE and similar tools generate a diverse set under constraints for exactly this reason."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Explain SHAP values from first principles and how you would present them for one prediction.",
        strong: "Treat the prediction as a payout to be divided among the features, and ask for the division that satisfies four axioms: the shares sum to the prediction minus a baseline, interchangeable features get equal shares, a feature that changes nothing gets zero, and the shares for a sum of models are the sum of shares. Shapley proved there is exactly one such division: each feature's average marginal contribution over every order in which the features could be added, where 'the model with a subset of features present' means the expected output with those features fixed at the row's values and the rest drawn from a background. For a three-feature model with an interaction I computed it by hand over four coalitions per feature — φ = (1.75, 0.5, 0.75), summing to the prediction minus the baseline — and shap reproduced it exactly. For trees TreeSHAP computes this exactly in polynomial time, 297 customers in 14 milliseconds; for other models KernelSHAP samples coalitions at hundreds of calls per row. To present one prediction I show a waterfall from the baseline to the prediction, in probability or log-odds — for the highest-risk churn customer, the base rate of 12 % rose to 61 %, with four logins contributing +1.08 log-odds and two months' tenure +0.93 — I state the baseline, because every value is relative to it, and I caption it as the model's reasoning, not the customer's.",
        answer: [
          { t: "p", text: "Axioms, formula in words, the value function and baseline, the hand computation, the explainers with cost, and the waterfall with its caveat." }
        ]
      },
      {
        level: "core",
        q: "SHAP versus LIME: which would you use, and what are the pitfalls of each?",
        strong: "SHAP by default, and LIME for a quick intuition or where SHAP has no efficient explainer. SHAP's attribution is axiomatic and additive: the values sum to the prediction minus the baseline, TreeSHAP is exact for tree ensembles, and the same per-row values aggregate into a global importance and dependence plots that recover a feature's shape without the PDP's extrapolation. Its pitfalls are the background — change it and every value changes, 1.26 versus 1.32 for the same feature with two backgrounds — the log-odds scale, which needs translating for an audience, the cost of KernelSHAP on non-tree models, and the interventional perturbations that can query the model on unrealistic combinations when features are correlated. LIME fits a weighted sparse linear surrogate to random perturbations near the row; it is intuitive and model-agnostic, but it is stochastic — on the same customer the top two features swapped in one seed of five and third place changed feature in two — and its fidelity must be measured, 0.55 here, meaning the linear story captured half of the black box's local behaviour. If I use LIME I report the seed spread and the fidelity with it; if I use SHAP I state the baseline and the units. Neither explains causes.",
        answer: [
          { t: "p", text: "The recommendation, SHAP's strengths and four pitfalls, LIME's mechanism and two measured weaknesses, and the reporting rules." }
        ]
      },
      {
        level: "advanced",
        q: "A regulator asks for 'the reasons' a loan model declined an applicant, and the applicant asks what they could do differently. Design the explanations.",
        strong: "Two audiences, two tools, one caveat. For the regulator I would provide SHAP values from a stated baseline — the approved population, so that each value reads as 'relative to an approved applicant' — in probability units, with the top contributors as the adverse-action reasons, and the same computation run for the whole declined population so that the individual reasons can be checked against the model's global behaviour and against protected attributes. Where the regulator wants a rule, I would add an anchor with its precision and coverage, and if no short rule reaches the precision threshold I would say so rather than report a rule that fails one time in five. For the applicant I would generate counterfactuals restricted to features they can change — income, outstanding debt, loan term, not age or postcode — kept within the range of real applicants, and offered as a diverse set at different distances, because the nearest flip sits on the decision boundary and is not a plan: on the churn model one extra login flipped a customer to 0.49, and a robust option was five logins and one fewer ticket at 0.30. Every document would say what the explanation is: the model's reasoning about the model's inputs. Whether those inputs cause repayment, and whether the model's reliance on them is fair, are questions the explanation raises and cannot settle — that is the fairness and causality work of 11.7, and it belongs in the same file.",
        answer: [
          { t: "p", text: "SHAP with a chosen baseline and population check for the regulator, constrained diverse counterfactuals for the applicant, anchors with honest failure, and the causal boundary stated." }
        ]
      }
    ]
  }
});

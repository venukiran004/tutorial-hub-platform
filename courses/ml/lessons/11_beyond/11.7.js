/* ============================================================================
   LESSON 11.7 — Fairness, Causality and ML System Design
   ========================================================================= */
EC.receiveLesson({
  id: "11.7",

  lede: "**Three subjects that share one lesson: the model is not the decision, and the questions that matter — who is harmed, what actually causes what, and how the whole system holds together — are answered outside the loss function.** A loan model on simulated applicants with a 0.86 / 0.68 repayment rate by group approves 84 % of one group and 47 % of the other at a single threshold; removing the protected attribute changes the gap from 0.37 to 0.30, because income, score and postcode carry it. The impossibility is worked in arithmetic: with equal true- and false-positive rates, PPV is 0.903 for one group and 0.830 for the other whenever the base rates differ. A promotion sent to engaged customers shows a naive effect of +11.7 against a true +3.0; regression adjustment gives +3.01 and inverse-propensity weighting +3.22, and an unmeasured confounder leaves every method at +7.2 — only randomisation recovers the truth. Selecting on a collider manufactures a −0.62 correlation between two independent traits. An uplift model from a randomised experiment finds the customers worth treating (+3.8 each in the top half against +1.7 on average, and a bottom decile the promotion harms) where a response model, correlated −0.07 with the true effect, targets the sure things. The lesson closes with the system-design round: a structure to answer it, and the arithmetic — 0.96 MB/s of online reads, 6.4 GB a day offline, point-in-time joins — that turns a diagram into a design.",

  objectives: [
    "Measure a model's disparity with demographic parity, equal opportunity, predictive parity and calibration, and explain the impossibility theorem in arithmetic",
    "Explain why removing a protected attribute does not remove disparity, and what mitigation by group thresholds costs",
    "Read a DAG, distinguish confounders from colliders, and estimate a treatment effect by adjustment, propensity weighting and stratification — and state when nothing works",
    "Build an uplift model from a randomised experiment and explain why a response model targets the wrong people",
    "Answer an ML system-design question with a structure, capacity arithmetic and the failure modes named"
  ],

  prerequisites: ["2.3", "2.5", "11.1"],

  blocks: [

    { t: "h2", n: "01", text: "Measuring bias, and the attribute you cannot remove", id: "fairness" },

    { t: "code", lang: "python", title: "A simulated loan book: 20,000 applicants, a protected attribute A, income and score correlated with A, a postcode that proxies it (executed)",
      code: `# repayment rate: group 0 0.862, group 1 0.679;  postcode = 1 for 20 % of group 0 and 71 % of group 1
# logistic regression, approve if P(repay) >= 0.75 (break-even at £100 per repaid loan and −£300 per default)
#  features                        AUC     approval 0 / 1      TPR 0 / 1         FPR 0 / 1       PPV 0 / 1       calibration (mean p − rate)
#  all, including A               0.820   0.839 / 0.467      0.889 / 0.602    0.519 / 0.177    0.916 / 0.880    −0.002 / −0.000
#  A removed, postcode kept       0.819   0.818 / 0.496      0.871 / 0.632    0.475 / 0.204    0.921 / 0.870    −0.011 / +0.014
#  A and postcode removed         0.819   0.807 / 0.509      0.862 / 0.647    0.456 / 0.214    0.923 / 0.867    −0.016 / +0.022
# demographic-parity gap 0.372 -> 0.322 -> 0.298;  equal-opportunity gap 0.287 -> 0.239 -> 0.215`,
      caption: "Four measurements, four questions. Demographic parity asks whether the groups are approved at the same rate (no: 84 % against 47 %). Equal opportunity asks whether applicants who *will* repay are approved at the same rate (no: 89 % against 60 %). Predictive parity asks whether an approval means the same thing in each group (nearly: 92 % against 88 % repay). Calibration asks whether the scores are honest per group (yes, within 0.02). Removing A cuts the gaps by a fifth, because income, score and postcode are correlated with A and the model reconstructs it — 'fairness through unawareness' is not a mitigation, and it also removes the ability to measure and correct the disparity." },

    { t: "code", lang: "text", title: "The impossibility, in arithmetic (executed)",
      code: `PPV = TPR·b / (TPR·b + FPR·(1 − b))       b = the group's base rate

base rates 0.70 / 0.55, TPR 0.80, FPR 0.20 in both groups:  PPV = 0.903 / 0.830
base rates 0.70 / 0.55, TPR 0.90, FPR 0.10:                  PPV = 0.955 / 0.917
base rates 0.50 / 0.50, TPR 0.80, FPR 0.20:                  PPV = 0.800 / 0.800      <- equal only because the base rates are equal
the exercise: TPR 0.85 / FPR 0.15 with base rates 0.9 / 0.6 -> PPV 0.981 / 0.895, NPV 0.386 / 0.791, approval rate 0.780 / 0.570`,
      caption: "Chouldechova and Kleinberg, Mullainathan and Raghavan proved what the arithmetic shows: when the base rates differ, a classifier cannot have equal error rates (TPR and FPR) across groups and be equally predictive (PPV, or calibration) across groups at the same time. Any two of the three can be had; the third is fixed by Bayes' rule. So 'make the model fair' is not a specification — the specification is which disparity the organisation refuses to allocate unequally, and that is a decision about harms, not a modelling step." },

    { t: "code", lang: "python", title: "Mitigation by a group-specific threshold, and its cost (executed)",
      code: `#  policy                                          approval 0 / 1     TPR 0 / 1        FPR 0 / 1        PPV 0 / 1       profit
#  one threshold, 0.75                             0.839 / 0.467     0.889 / 0.602   0.519 / 0.177   0.916 / 0.880   £433.7k
#  equal opportunity: group 1 threshold 0.505      0.839 / 0.783     0.889 / 0.890   0.519 / 0.553   0.916 / 0.776   £370.1k
#  demographic parity: group 1 threshold 0.500     0.839 / 0.788     0.889 / 0.893   0.519 / 0.562   0.916 / 0.773   £367.6k   (the closest the search range allowed)`,
      caption: "Equalising the true-positive rate means approving group-1 applicants at a probability of 0.505 — below the break-even 0.75 — so the bank funds loans it expects to lose money on: profit falls 15 % and the group's PPV drops from 0.88 to 0.78, which is the impossibility again. Whether that is the right policy is a question about the cost of denying a creditworthy applicant against the cost of a default, and about the law; the model's job is to make the trade-off visible and measurable, per group, on every release." },

    { t: "table", head: ["Criterion", "Requires equal …", "Asks", "Fails when"], rows: [
      ["Demographic parity", "approval rate", "are the groups treated the same?", "the base rates differ and accuracy matters"],
      ["Equal opportunity", "TPR", "are the qualified treated the same?", "PPV then differs (impossibility)"],
      ["Equalised odds", "TPR and FPR", "are the qualified and the unqualified treated the same?", "PPV differs; often needs randomised decisions to achieve"],
      ["Predictive parity", "PPV", "does an approval mean the same thing?", "TPR then differs"],
      ["Calibration by group", "P(y | score, group)", "are the scores honest per group?", "error rates differ; and calibration can coexist with large disparities"],
      ["Individual fairness", "similar treatment of similar people", "is the metric of similarity defensible?", "the metric encodes the same disparities"]
    ] },

    { t: "h2", n: "02", text: "Causality: confounders, colliders and the effect of a promotion", id: "causality" },

    { t: "p", text: "A causal question — did the promotion raise spend? — is not a prediction question, and a model that predicts spend well can answer it wrongly. The potential-outcomes framing: each customer has a spend with the promotion Y(1) and without it Y(0); the effect is Y(1) − Y(0); only one is observed. The naive comparison of treated and untreated customers estimates the effect only if treatment was assigned independently of the potential outcomes — which a randomised experiment guarantees and observational data almost never does. A DAG draws the assumptions: a **confounder** causes both treatment and outcome and must be adjusted for; a **collider** is caused by both and must *not* be conditioned on; a **mediator** lies on the path and conditioning on it removes the effect you want." },

    { t: "code", lang: "python", title: "A promotion the marketing team sent to engaged customers (executed, 30,000 customers)",
      code: `# engagement -> treatment (engaged customers are more likely to get the promotion);  engagement -> spend (+8 per sd);  promotion -> spend (+3, the truth)
# treated share 0.415;  the treated have engagement +0.64 sd, the untreated −0.45 sd

naive difference of means                                +11.718     <- the treated were going to spend more anyway
regression of spend on treatment AND engagement           +3.013
inverse-propensity weighting (a logistic model of treatment) +3.222   propensities range 0.001-0.998: overlap holds, but thinly
IPW with propensities clipped to [0.05, 0.95]             +3.672     <- clipping trades the extreme weights' variance for bias
stratified by propensity, 5 strata                        +4.007     <- residual confounding inside each stratum
stratified by propensity, 20 strata                       +3.233

with an UNMEASURED confounder (a hidden trait that raises both treatment and spend): adjusting for engagement gives +7.177
# no method on the observed data recovers +3; only randomised assignment does`,
      caption: "Adjustment works when the confounders are measured and the model of them is right — regression assumes the functional form, propensity methods assume overlap, and both assume no unmeasured confounder, which is an assumption about the world rather than the data. The last line is the honest one: the hidden trait is invisible in every table you have, and the estimate is wrong by a factor of two with no diagnostic that says so. Sensitivity analysis asks how strong an unmeasured confounder would have to be to explain the result away; randomisation makes the question moot, which is why 11.1's A/B test is the causal instrument of choice." },

    { t: "code", lang: "python", title: "A collider: conditioning on a consequence of both (executed)",
      code: `skill ~ N(0, 1), luck ~ N(0, 1), independent;   hired = skill + luck > 1
correlation of skill and luck:  everyone −0.004;  among the hired −0.618
# the exercise: the more selective the gate, the stronger the artefact -- hire the top 76 %: −0.30;  top 50 %: −0.47;  top 24 %: −0.62;  top 8 %: −0.74`,
      caption: "Among people who passed a gate that rewards either quality, the two qualities are negatively related — because those with little of one needed a lot of the other. 'Talented people are lazy', 'attractive people are rude', 'the best-reviewed restaurants have the worst service': selection on a collider. Conditioning on it — filtering a dataset by an outcome, or adding a downstream variable as a feature — invents relationships, and the DAG is the tool that says which variables to leave alone." },

    { t: "h2", n: "03", text: "Uplift: who to treat, from a randomised experiment", id: "uplift" },

    { t: "code", lang: "python", title: "40,000 customers randomised to a promotion; the effect varies by customer (executed)",
      code: `# true effect: +4 for customers with low x1 (who spend little regardless), −2 for a sixth of customers, 0 otherwise; average +1.69
difference of means (randomised):                       +1.700

S-learner (one model with T as a feature, differenced):  correlation with the true effect 0.982, mean |error| 0.315
T-learner (a model per arm, differenced):                correlation 0.988, mean |error| 0.227

uplift by predicted decile (T-learner), top to bottom:   +4.04  +4.11  +4.22  +4.03  +2.68  +0.14  −0.12  −0.20  +0.12  −1.35
targeting the top 50 % by predicted uplift: +3.82 per customer treated, against +1.69 for treating everyone;  the bottom decile: −1.35 -- treating them hurts

a RESPONSE model (P(high spend | treated)): correlation with the true effect −0.07  -- it ranks by who spends, and they are the sure things`,
      caption: "Uplift modelling estimates the *difference* the treatment makes per customer, not the outcome. The four segments are the persuadables (treat), the sure things (waste), the lost causes (waste) and the sleeping dogs (harm — the bottom decile here). A response model trained on the treated arm ranks the sure things first, because they spend the most, and its correlation with the true effect is zero. Uplift needs a randomised experiment or an honest observational adjustment as its training data, and is evaluated by uplift-by-decile and Qini curves rather than by accuracy — there is no per-customer label for the effect." },

    { t: "h2", n: "04", text: "The system-design round", id: "design" },

    { t: "p", text: "The question is usually 'design X' — a fraud system, a recommender, a feature store, a labelling pipeline — and the failure mode is drawing boxes without numbers or naming a stack without a reason. The structure that works: clarify the requirements (users, latency, scale, the metric, what a wrong answer costs); state the decision and its shape (batch, real-time, streaming — 11.1); walk the data path from event to feature to model to action to feedback; do the arithmetic; name the failure modes and their monitors; and say what you would build first." },

    { t: "code", lang: "text", title: "Capacity arithmetic for a feature store behind a real-time fraud model (executed)",
      code: `online reads:   3,000 requests/s × 40 features × 8 B = 0.96 MB/s;  a p99 lookup budget of 10 ms rules out a disk-backed store -> in-memory key-value store
offline store:  20,000,000 events/day × 40 features × 8 B = 6.4 GB/day; 90 days = 0.58 TB -> columnar files partitioned by day
point-in-time correctness: a training row for a transaction at time t must use feature values AS OF t, not the latest --
   the training join is (entity, t) against feature history, which is why the offline store keeps versions rather than a current snapshot,
   and why the same feature definition must produce the online value and the historical value (11.1's skew)`,
      caption: "Three numbers and one rule carry most of a feature-store design: the online store is small and fast, the offline store is large and versioned, and the join is point-in-time. The rest — a registry of feature definitions, a single transformation library used by both paths, backfills, freshness monitoring — follows from those." },

    { t: "table", head: ["Design prompt", "The decision and its shape", "The arithmetic to do", "The failure modes to name"], rows: [
      ["A feature store", "batch features from the warehouse + streaming features from events; online and offline stores", "QPS × features × bytes; events/day × retention; the point-in-time join", "training–serving skew; stale features; a definition changed under a model"],
      ["A labelling system", "queue-based task assignment, guidelines with examples, gold questions, agreement measured", "labels/day per annotator × annotators; redundancy × cost; active learning's savings", "inconsistent guidelines; drift in annotators; the model's own errors fed back as labels"],
      ["Scaling training", "data parallel first, then model parallel; mixed precision; checkpoints", "samples/s per accelerator; bandwidth for gradient all-reduce; time to a checkpoint", "stragglers; silent numerical divergence; non-reproducible runs"],
      ["A recommender (11.4)", "candidate generation → ranking → re-ranking, batch candidates, real-time ranking", "users × candidates × features per request; embedding table sizes", "the exposure loop; cold start; popularity bias; offline–online gap"],
      ["A fraud system (9.5, 11.1)", "real-time scoring inside the payment with past-only features; nightly retraining; a queue for review", "latency budget by component; labels' delay; queue depth against reviewers", "label latency; adversarial drift; a leak through post-transaction features; the threshold as an artefact"]
    ] },

    { t: "ladder",
      title: "Answering 'design a system to decide which customers get a retention offer'",
      rungs: [
        { level: "bad", label: "Train a churn model, offer to everyone above a threshold", code: `offer = churn_model.predict_proba(X)[:, 1] > 0.35`,
          note: "**A prediction is not a decision: the offer goes to customers who would have stayed anyway and to some it annoys into leaving; and nobody asked what the offer costs, whether the decision is fair across groups, or how the loop is closed.**" },
        { level: "ok", label: "Churn model plus a cost-based threshold, monitored", code: `threshold from the cost of an offer against the value of a retained customer (2.3); monitors from 11.1`,
          note: "A decision with a cost model. Still assumes the offer works on everyone equally, and still targets by outcome rather than by effect." },
        { level: "best", label: "A randomised holdout to measure the offer's effect, an uplift model to target it, fairness measured per group, and the loop closed", code: `experiment: randomise the offer on a slice -> true effect (+1.7 average here), effect by segment
uplift model on the experiment -> treat the persuadables (+3.8), never the sleeping dogs (−1.35)
report approval and outcome rates by protected group; monitor drift, coverage and the effect in the holdout each quarter`,
          note: "The system decides on the basis of what the offer *changes*, keeps a holdout so the effect is re-measured as the world moves, and reports who it helps and who it does not." }
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Removing the protected attribute from the loan model reduced the demographic-parity gap from 0.372 to 0.322. Why not to zero?",
          options: [
            "Because the model was not retrained",
            "Because income, score and postcode are correlated with the attribute (postcode is 1 for 71 % of one group and 20 % of the other), so the model reconstructs it from proxies; unawareness removes the label, not the information, and also removes the ability to measure and correct the disparity",
            "Because the test set was small",
            "Because logistic regression cannot be made fair"
          ],
          answer: 1,
          why: "Proxies are the rule, not the exception: address, name, purchase history and language all carry protected information. The attribute is needed at evaluation time to measure disparity, and at decision time if the mitigation is a group-specific threshold — which is why many fairness interventions require the attribute rather than hide it."
        },
        {
          stem: "With equal TPR and FPR across two groups whose repayment rates are 0.70 and 0.55, PPV came out at 0.903 and 0.830. Can a different classifier fix this?",
          options: [
            "Yes, a better model would equalise PPV too",
            "No: PPV = TPR·b/(TPR·b + FPR·(1 − b)) depends on the base rate b, so equal error rates force unequal PPV whenever the base rates differ — the impossibility theorem; the choice of which quantity to equalise is a policy decision about harms, not a modelling problem",
            "Yes, by removing the base-rate difference from the data",
            "Only with a neural network"
          ],
          answer: 1,
          why: "Bayes' rule links the three quantities; with unequal base rates you may choose two. Equal opportunity on the loan book cost 15 % of profit and dropped one group's PPV to 0.78; demographic parity did similarly. Each is a defensible policy for a different harm, and the impossibility is why the choice must be made explicitly."
        },
        {
          stem: "The naive effect of the promotion was +11.7 and the true effect +3.0. Regression adjustment recovered +3.01; with a hidden confounder the same regression gave +7.2. What does the second number teach?",
          options: [
            "That regression is the wrong method",
            "That every observational method assumes no unmeasured confounding, and the assumption is invisible in the data: the estimate is wrong by a factor of two with no diagnostic that says so; randomisation is the only design that removes the assumption, and sensitivity analysis is the honest fallback",
            "That propensity weighting should have been used",
            "That the sample was too small"
          ],
          answer: 1,
          why: "Adjustment methods differ in how they use measured confounders (regression's functional form, IPW's overlap, stratification's residual confounding — +4.0 with five strata, +3.2 with twenty); none can use a confounder they cannot see. The question a causal claim from observational data must answer is 'how strong would a hidden confounder have to be to explain this away'."
        },
        {
          stem: "A response model trained on the treated arm had a correlation of −0.07 with the true treatment effect while the uplift model had 0.99. Why does the response model fail?",
          options: [
            "It was trained on too little data",
            "It ranks customers by their outcome under treatment, which is dominated by how much they spend regardless; the customers with the largest effect here spend little without the promotion, so a response model targets the sure things and misses the persuadables — the effect is a difference, and only a model of the difference finds it",
            "It should have used the control arm instead",
            "Response models cannot be trained on experiments"
          ],
          answer: 1,
          why: "Targeting by predicted outcome is the most common mistake in marketing analytics: it spends the budget on customers who would have converted anyway and can include the sleeping dogs the treatment harms (−1.35 in the bottom decile). The randomised experiment is what makes the uplift model's training target — the difference between arms — estimable."
        }
      ] },

    { t: "exercise",
      kind: "Compute",
      title: "The impossibility at other base rates, IPW by hand, and the strength of a collider",
      difficulty: "core",
      minutes: 24,
      body: [
        { t: "p", text: "**(a)** With TPR 0.85 and FPR 0.15 in both groups, compute PPV, NPV and the approval rate for base-rate pairs (0.9, 0.6), (0.8, 0.8) and (0.3, 0.1). What does demographic parity then require?" },
        { t: "p", text: "**(b)** Eight customers: engaged ones (spend 30, 28, 32 treated; 26 untreated) and unengaged ones (18 treated; 12, 14, 13 untreated). Compute the propensity per stratum, the IPW weights, the naive difference, the IPW effect and the stratified effect." },
        { t: "p", text: "**(c)** With independent skill and luck, hire if skill + luck exceeds −1, 0, 1 and 2, and report the share hired and the correlation of skill and luck among the hired." }
      ],
      requirements: [
        "(a) three rows of three numbers and a sentence.",
        "(b) the table of weights and three effects.",
        "(c) four rows."
      ],
      hint: "(a) Approval rate = TPR·b + FPR·(1 − b). (b) The weight of a treated customer is 1/e, of an untreated one 1/(1 − e). (c) The artefact grows with selectivity.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) base rates     PPV             NPV             approval rate
#     0.9 / 0.6      0.981 / 0.895   0.386 / 0.791   0.780 / 0.570
#     0.8 / 0.8      0.958 / 0.958   0.586 / 0.586   0.710 / 0.710      <- equal base rates: everything equal
#     0.3 / 0.1      0.708 / 0.386   0.930 / 0.981   0.360 / 0.220
#     Equal error rates give unequal PPV, NPV and approval rates whenever the base rates differ; demographic parity (equal approval)
#     would then require unequal TPR and FPR -- one of the three families must give.

# (b) propensity: engaged 3/4 = 0.75, unengaged 1/4 = 0.25
#     weights: treated engaged 1/0.75 = 1.333; untreated engaged 1/0.25 = 4; treated unengaged 4; untreated unengaged 1.333
#     naive difference: mean(30, 28, 32, 18) − mean(26, 12, 14, 13) = 27 − 16.25 = +10.75
#     IPW: treated Σwy/Σw = 24.000, control 19.500, effect +4.500
#     stratified: engaged 30 − 26 = +4, unengaged 18 − 13 = +5, average +4.5 -- identical to IPW, because the strata ARE the propensity

# (c) gate       share hired    corr(skill, luck | hired)
#     > −1         75.8 %            −0.297
#     >  0         49.7 %            −0.472
#     > +1         23.9 %            −0.624
#     > +2          7.8 %            −0.744`,
        notes: [
          { t: "p", text: "(a) is the theorem as a table: pick the base rates and the equalities you want, and Bayes' rule sets the rest." },
          { t: "p", text: "(b) shows IPW and stratification as the same idea — reweight the sample to look randomised — and why they agree exactly when the confounder is discrete." },
          { t: "p", text: "(c) is the collider's dose–response: the more a dataset has been selected on an outcome, the more it lies about the causes." }
        ]
      }
    }
  ],

  takeaways: [
    "Measure disparity four ways — approval rate, TPR, PPV, calibration by group — because they answer different questions and cannot all be equal when base rates differ: PPV = TPR·b/(TPR·b + FPR·(1 − b)) is the impossibility in one line.",
    "Removing the protected attribute is not a mitigation (the gap went from 0.37 to 0.30 through proxies) and removes the ability to measure; mitigation by group thresholds has a measurable cost (15 % of profit, PPV 0.88 → 0.78) and is a policy decision about which harm to equalise.",
    "A causal effect is a difference between potential outcomes; a naive comparison (+11.7 for a true +3.0) is confounded, adjustment and propensity methods recover it when the confounders are measured and overlap holds (+3.01, +3.22), and an unmeasured confounder defeats every method silently (+7.2) — randomise where you can.",
    "Do not condition on colliders: selecting on skill + luck manufactured a −0.62 correlation between independent traits, growing with selectivity; a DAG says which variables to adjust for and which to leave alone.",
    "Uplift models estimate the treatment's effect per customer from a randomised experiment (top half +3.8 against +1.7 average; a bottom decile the treatment harms); a response model targets the sure things and is uncorrelated with the effect.",
    "The system-design answer has a structure — requirements, decision shape, data path, arithmetic, failure modes, what to build first — and the arithmetic (0.96 MB/s online, 6.4 GB/day offline, point-in-time joins) is what makes the boxes a design."
  ],

  quiz: {
    title: "Fairness, Causality and ML System Design — Knowledge Check",
    questions: [
      {
        stem: "A hiring model is calibrated within each group and a regulator asks why its true-positive rates differ by group. What is the honest answer?",
        options: [
          "The model is fair because it is calibrated",
          "Calibration and equal error rates are incompatible when the groups' base rates differ (the impossibility theorem); the organisation chose calibration, and equalising TPR would require group-specific thresholds with a measured cost — which criterion to satisfy is a policy choice the regulator and the organisation must make explicitly",
          "The difference is noise",
          "TPR cannot be measured by group"
        ],
        answer: 1,
        why: "The executed loan book showed the same structure: calibrated within 0.02 per group, TPR 0.89 against 0.60. Neither number is a bug; the pair is a consequence of Bayes' rule, and the responsible answer names the trade-off and the choice rather than claiming fairness from one metric."
      },
      {
        stem: "Which of these is a collider that should not be conditioned on when estimating the effect of a training programme on promotion?",
        options: [
          "Prior performance, which affects both selection into the programme and promotion",
          "Being nominated for a leadership award after the programme, which is caused both by the programme and by promotion-relevant qualities — conditioning on it (analysing nominees only) manufactures a spurious relationship, as selecting on skill + luck did",
          "Department, which affects who is offered the programme",
          "Tenure at the start of the programme"
        ],
        answer: 1,
        why: "Prior performance, department and tenure are confounders — causes of both treatment and outcome — and must be adjusted for. The award is downstream of both and is a collider; filtering to nominees, or adding nomination as a feature, induces bias. The DAG distinguishes the two; the variables' names do not."
      },
      {
        stem: "Propensity weights of 1,000 appeared for customers with a propensity of 0.001. What does that signal and what is the remedy?",
        options: [
          "A bug in the logistic regression",
          "Thin overlap: such customers are almost never treated, so the few who were carry enormous weight and the estimate's variance explodes (IPW +3.22 against regression +3.01); clipping or trimming the propensities trades that variance for bias (+3.67 clipped), and if a region has no overlap at all, no method can estimate the effect there",
          "That the treatment effect is large",
          "That more strata are needed"
        ],
        answer: 1,
        why: "Overlap (positivity) is the second assumption of observational causal inference after no unmeasured confounding; where a group is never treated, the counterfactual is pure extrapolation. Checking the propensity distribution by arm is the first diagnostic, and restricting the estimate to the region of common support is the honest response."
      },
      {
        stem: "A marketing team wants to target next quarter's promotion with a model trained on last quarter's campaign, which went to customers chosen by the sales team. What is the problem and the fix?",
        options: [
          "No problem — the campaign data are labelled",
          "The treatment was assigned by the sales team's judgement, so treated and untreated customers differ in ways the data may not record; an uplift model on that data inherits the confounding. The fix is a randomised holdout in the next campaign (even a small one) to measure the effect honestly and to train the uplift model on, with the sales-team assignment kept as a feature rather than a filter",
          "Use a response model instead",
          "Retrain on the treated customers only"
        ],
        answer: 1,
        why: "The confounding experiment showed +11.7 against a true +3.0 from exactly this kind of targeting; adjustment helps only if the sales team's criteria are recorded, and an unrecorded 'gut feel' is the unmeasured confounder that defeats every method. A randomised slice costs a little revenue and buys the only reliable estimate."
      },
      {
        stem: "In a system-design interview you are asked to design a feature store. Which answer shows the most judgement?",
        options: [
          "Name a vendor and list its components",
          "Ask for the load and latency, do the arithmetic (3,000 QPS × 40 features × 8 B ≈ 1 MB/s online, 6.4 GB/day offline), derive the store types from it, insist on point-in-time joins and a single transformation library for both paths, and name the failure modes — skew, staleness, silently changed definitions — with the monitor for each",
          "Draw the offline and online stores and stop",
          "Propose streaming everything"
        ],
        answer: 1,
        why: "The interviewer is testing whether the candidate can turn requirements into numbers and numbers into choices, and whether they know how the system fails. The arithmetic makes the in-memory online store and the partitioned columnar offline store consequences rather than preferences; point-in-time correctness is the property that separates a feature store from a cache."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Fairness, Causality and System Design",
    sub: "The decision behind the model, the cause behind the correlation, and the system around both.",
    questions: [
      {
        level: "Core",
        q: "How would you check whether a model is fair?",
        strong: "First by asking what harm the model can do and to whom, because 'fair' is not one thing. Then by measuring, per protected group and on a held-out set: the rate of the favourable decision (demographic parity), the true-positive rate among those who deserve it (equal opportunity), the false-positive rate, the precision of a favourable decision (predictive parity), and calibration. On a simulated loan book the model approved 84 % of one group and 47 % of the other, gave the creditworthy a 0.89 against 0.60 chance of approval, and was calibrated within 0.02 in both — all at once, because when the base rates differ (0.86 against 0.68) the impossibility theorem says equal error rates and equal predictive value cannot coexist: PPV = TPR·b/(TPR·b + FPR·(1 − b)). Removing the protected attribute did not help — the gap fell from 0.37 to 0.30 through income, score and postcode — so I keep the attribute for measurement and, if the policy is equal opportunity, for a group-specific threshold, whose cost I measure: 15 % of profit and a PPV of 0.78 in that case. Which criterion to satisfy is a decision about harms for the organisation and its regulator, and my job is to make every option's numbers visible.",
        answer: [
          { t: "p", text: "Harm first, the four measurements with the executed values, the impossibility, why unawareness fails, and the mitigation with its cost as a policy choice." }
        ]
      },
      {
        level: "Core",
        q: "What is the difference between a confounder and a collider, with an example of each?",
        strong: "A confounder causes both the treatment and the outcome; ignoring it biases the effect and adjusting for it removes the bias. Engagement in my promotion experiment: engaged customers were more likely to get the promotion and spent more anyway, so the naive effect was +11.7 for a true +3.0, and regressing on engagement gave +3.01. A collider is caused by both — the reverse arrows — and conditioning on it *creates* bias. Being hired when hiring rewards skill or luck: among everyone the two were uncorrelated, among the hired they correlated at −0.62, because those with little of one needed the other; the tighter the gate, the stronger the artefact. The practical rule is that a DAG decides: adjust for the variables on back-door paths, leave colliders and mediators alone, and remember that filtering a dataset by an outcome is conditioning on a collider whether or not anyone drew the graph.",
        answer: [
          { t: "p", text: "Both definitions with the executed examples and numbers, the direction of the arrows, and the DAG rule." }
        ]
      },
      {
        level: "Senior",
        q: "You have observational data on a promotion and no experiment. How would you estimate its effect, and what would you refuse to claim?",
        strong: "I would draw the DAG with the business — who decided who got the promotion and on what — and record every variable on a back-door path. Then three estimators that should agree: regression of the outcome on treatment and the confounders; a propensity model of treatment, used for inverse-probability weighting after checking overlap — my propensities ran from 0.001 to 0.998, and the extreme weights moved the estimate from +3.01 to +3.22, so I would trim or clip and report both; and stratification on the propensity, with enough strata that residual confounding is small (five strata gave +4.0, twenty gave +3.2). Agreement is reassuring, not proof. What I refuse to claim is that the estimate is causal without qualification, because every one of these assumes no unmeasured confounder, and the experiment where I added a hidden trait gave +7.2 from the same regression with no diagnostic that anything was wrong. I would report a sensitivity analysis — how strong a hidden confounder would have to be to explain the effect away — and propose a randomised holdout in the next campaign, which is cheap and is the only design that removes the assumption.",
        answer: [
          { t: "p", text: "The DAG, three estimators with executed numbers and their diagnostics, the unmeasured-confounder limit, sensitivity analysis, and the randomised holdout." }
        ]
      },
      {
        level: "Senior",
        q: "Explain uplift modelling and why it is not the same as predicting who will convert.",
        strong: "Uplift modelling estimates, per customer, the difference the treatment makes — Y(1) − Y(0) — rather than the outcome. It needs training data where treatment assignment is independent of the potential outcomes, which in practice means a randomised experiment. The simplest learners: an S-learner, one model with treatment as a feature, predicting both arms and differencing; a T-learner, one model per arm, differenced; on 40,000 randomised customers with an effect that varied by customer, the T-learner's estimate correlated 0.99 with the true effect. It is evaluated by uplift per predicted decile and Qini curves, because no customer has a label for the effect: the top half by predicted uplift showed +3.8 per customer against +1.7 for everyone, and the bottom decile −1.35 — customers the promotion drives away. A response model — who converts when treated — ranks by outcome level, which in that experiment was dominated by customers who spend a lot regardless; its correlation with the true effect was −0.07. It targets the sure things and can include the sleeping dogs. The four segments — persuadables, sure things, lost causes, sleeping dogs — are the reason the two models give different lists, and only the uplift list is worth the budget.",
        answer: [
          { t: "p", text: "The estimand, the data requirement, the learners with executed accuracy, the evaluation by decile, the response-model failure with its number, and the four segments." }
        ]
      },
      {
        level: "Staff",
        q: "Design an ML labelling system for a company that needs 500,000 labelled documents in three months.",
        strong: "Requirements first: what the labels are for, how consistent they must be, the cost of a wrong label, and who the annotators are — in-house experts, a vendor, or crowd. Then the arithmetic: 500,000 documents in 60 working days is 8,300 a day; at 150 labels per annotator-day with double labelling on 20 % for agreement, that is about 65 annotators, or fewer if active learning and pre-labelling reduce the load. The components: a task queue that assigns documents without duplicates and balances load; guidelines with worked examples and a glossary, versioned, because most disagreement is guideline ambiguity; gold questions seeded into the stream to measure each annotator against a known answer; agreement measured continuously (Cohen's or Krippendorff's alpha) with adjudication for disagreements; an interface that makes the common case one keystroke; and a data model that stores every label with its annotator, guideline version and timestamp so that labels can be re-weighted or excluded later. Efficiency: a model trained on the first tranche pre-labels the rest for correction, and active learning routes the uncertain documents to experts and the confident ones to spot checks — with a randomised slice always labelled from scratch so the model's errors are not laundered into the training set. Failure modes I would name: guideline drift as annotators learn the model's biases; a vendor optimising throughput over agreement; class imbalance in what active learning surfaces; and privacy, if the documents contain personal data. What I would build first: the guidelines and gold set with a pilot of 2,000 documents, because the agreement number from the pilot decides whether the 500,000 are worth labelling at all.",
        answer: [
          { t: "p", text: "Requirements, the throughput arithmetic, the six components, active learning with the randomised safeguard, four failure modes, and the pilot as the first step." }
        ]
      }
    ]
  }
});

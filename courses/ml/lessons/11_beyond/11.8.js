/* ============================================================================
   LESSON 11.8 — The Interview: Classics and Cases
   ========================================================================= */
EC.receiveLesson({
  id: "11.8",

  lede: "**The questions every round asks are the ones this course has already answered with numbers, and the difference between a pass and an offer is whether you can say the number.** This lesson is the compendium. The classics — bias–variance, L1 against L2, precision against recall, what gradient boosting does at each step, what to do about imbalance — each get the shape of a strong answer and the executed evidence from earlier lessons to put inside it. The from-scratch implementations that coding rounds ask for are written and checked: gradient descent for linear regression reproduces the closed form to four decimals and diverges at a learning rate of 1.1; logistic regression by gradient descent matches scikit-learn's weights to four decimals with and without L2; k-means matches scikit-learn's inertia (1552.23) and a bad start finds 2560; three AUC implementations agree with scikit-learn to six decimals; a decision stump finds the same split as a depth-one tree. Then the cases — telecom churn, real-time fraud, drift monitoring, a new problem from nothing — with the structure to answer them and the course's own results as the worked example.",

  objectives: [
    "Give the strong-answer shape for the five classic questions, with executed evidence",
    "Implement gradient descent, logistic regression, k-means, AUC and a tree split from scratch, and check each against a reference",
    "Structure a case answer: the question behind the question, the decision, the baseline, the metric, the risks, the plan",
    "Walk the four standard cases end to end using the course's results",
    "Recognise the questions behind the questions — leakage, evaluation, the decision — in any framing"
  ],

  prerequisites: ["11.7", "10.9", "9.5"],

  blocks: [

    { t: "h2", n: "01", text: "The classics, with the numbers to say", id: "classics" },

    { t: "dl", items: [
      ["Bias–variance", "Expected squared error = bias² + variance + noise. Bias is what the model cannot represent; variance is how much it changes with the sample; the noise floor is what no model can reach. The shape of the answer: a low-capacity model under-fits (high bias), a high-capacity one fitted to few points memorises (high variance), and regularisation, more data and ensembling move along the curve. The number: in 11.6 a 256 × 256 network on 200 points scored 1.000 train / 0.851 test; weight decay of 1.0 gave 0.930 / 0.874 with the weight norm falling from 54 to 5 — variance traded for bias, test error down. In 11.4 the matrix-factorisation rank curve had its minimum at the generating rank and the regulariser moved the error more than the rank did."],
      ["L1 against L2", "L2 (ridge) shrinks all weights toward zero and never to zero; L1 (lasso) shrinks and *selects*, driving some weights to exactly zero, because its penalty has a corner at zero. Bayesian reading (11.2): L2 is a Gaussian prior, L1 a Laplace prior, and the Bayesian linear regression's posterior mean equalled ridge with λ = σ²/τ² to four decimals. When to use which: L2 for correlated features and stability, L1 for sparsity and interpretability, elastic net for both; L1's selection is unstable among correlated features — it picks one arbitrarily."],
      ["Precision against recall", "Precision is the share of positive calls that were right; recall the share of positives that were called. Worked on ten rows: TP 3, FP 2, FN 1, TN 4 gives precision 3/5 = 0.600, recall 3/4 = 0.750, F1 = 0.667. The threshold trades them, and the right operating point comes from costs, not from F1: in 2.3 with a £5 call, a £100 loss and a 40 % save rate the break-even probability is c/b = 5/40 = 0.125, the minimum-expected-cost threshold was 0.15 (recall 0.833, precision 0.288, cost £3,895) and the maximum-F1 threshold 0.25 cost more (£4,020) because F1 treats a missed churner and a wasted call as equally bad. AUC is threshold-free and is the probability a random positive outranks a random negative — implemented three ways below."],
      ["Gradient boosting internals", "Start from a constant (the mean for squared error, the log-odds for logistic loss); at each step fit a small tree to the *negative gradient* of the loss at the current predictions — the residuals for squared error, y − p for logistic loss — and add it scaled by a learning rate; the learning rate and the number of trees trade off, depth controls interactions, subsampling and column sampling add variance reduction. XGBoost and LightGBM add a second-order (Newton) step, L2 on the leaf values, histogram binning and leaf-wise growth. In 6.3 the first tree reduced the SSE from 16.07 at F₀, and each step's optimal multiplier was computed by hand (0.710 at step four). The question behind the question: why does it beat random forests on tables? — because it fits the residual structure sequentially, and why does it lose on trends? — because trees cannot extrapolate (10.6)."],
      ["Class imbalance", "Accuracy is the wrong metric: 2.5 % positives makes 'always no' 97.5 % accurate, and 8.2's untreated logistic regression had a recall of 6 %. Treatments: the threshold (the cheapest, and usually the right one), class weights (an intercept shift of ln(w₊/w₋) in a logistic model), resampling — with the leak to avoid: SMOTE applied before cross-validation produced an average precision of 0.998, applied inside each fold the honest number — and the metric: PR-AUC or average precision, recall at a fixed precision, cost. The number to say: the 11.1 rollback showed two churn models with the same AUC flagging 10 % and 61 % of customers at the same threshold — class weighting changes the scores, so the threshold is part of the artefact."]
    ] },

    { t: "callout", kind: "mental", title: "The question behind the question", body: "Almost every classic is a probe for one of three things: do you know what the evaluation is measuring (and what it is not), do you know where the leak is, and do you know that the model is not the decision? 'Explain precision and recall' is asking whether you will choose a threshold from costs. 'Explain boosting' is asking whether you know what it fits at each step and where it fails. 'How do you handle imbalance' is asking whether you will resample before or after the split. Answer the surface question in two sentences and the real one in the rest." },

    { t: "h2", n: "02", text: "From scratch, checked", id: "scratch" },

    { t: "code", lang: "python", title: "Gradient descent for linear and logistic regression (executed)",
      code: `def gd_linear(X, y, lr=0.1, epochs=300):
    Xb = np.c_[np.ones(len(X)), X]; w = np.zeros(Xb.shape[1])
    for _ in range(epochs): w -= lr * 2 * Xb.T @ (Xb @ w - y) / len(y)          # gradient of the mean squared error
    return w
# 500 rows, three features, true weights (2, −1, 0.5), intercept 1:
# GD after 300 steps  (0.9687, 2.0206, −0.9933, 0.5314)     closed form (XᵀX)⁻¹Xᵀy  (0.9687, 2.0206, −0.9933, 0.5314)
# MSE by step 1 / 10 / 100 / 300: 3.95 / 0.395 / 0.2647 / 0.2647     learning rate 0.01: 0.439 after 100 steps (slow);  1.1: 9.9e33 (diverges: the step exceeds 2/L)

def gd_logistic(X, y, lr=0.5, epochs=2000, l2=0.0):
    Xb = np.c_[np.ones(len(X)), X]; w = np.zeros(Xb.shape[1])
    for _ in range(epochs):
        p = 1 / (1 + np.exp(-(Xb @ w))); w -= lr * (Xb.T @ (p - y) / len(y) + l2 * np.r_[0, w[1:]])     # Xᵀ(σ(Xw) − y)/n: the same shape as linear regression
    return w
# GD (−0.1227, 1.9201, −1.0205, 0.5602)  vs  sklearn, no penalty (−0.1228, 1.9201, −1.0205, 0.5602)
# with L2 λ = 0.1: GD (0.8698, −0.4567, 0.2592)  vs  sklearn C = 1/(λn) (0.8699, −0.4567, 0.2592)`,
      caption: "Two things interviewers check: that the gradient is right (write it, then say why the logistic one has the same form as the linear one — the derivative of the log-loss through the sigmoid collapses to p − y) and that you know what the learning rate does. The divergence at 1.1 is the fact that gradient descent on a quadratic converges only if the step is below 2/L, with L the largest eigenvalue of the Hessian. The scikit-learn C = 1/(λn) conversion is the detail that shows you have compared the two before." },

    { t: "code", lang: "python", title: "k-means, AUC three ways, precision/recall, stratified folds and a stump (executed)",
      code: `def kmeans(X, k, seed):
    C = X[rng.choice(len(X), k, replace=False)]
    for _ in range(100):
        lab = np.argmin(((X[:, None] - C[None])**2).sum(2), axis=1)                    # assign
        newC = np.array([X[lab == j].mean(0) for j in range(k)])                       # update
        if np.allclose(newC, C): break
        C = newC
    return C, lab, ((X - C[lab])**2).sum()
# 600 points, 4 blobs: best of 10 starts inertia 1552.23 in 6 iterations = sklearn KMeans(n_init=10) 1552.23, centres match to 0.000; the worst start 2560.05

def auc_rank(y, s):                                                                     # Mann–Whitney: (Σ ranks of positives − n₁(n₁+1)/2) / (n₁n₀), average ranks for ties
def auc_pairs(y, s):                                                                    # P(score⁺ > score⁻) + ½P(equal) over sampled pairs
def auc_trapezoid(y, s):                                                                # sort by score, cumulative TPR and FPR, area
# 0.739456 / 0.7395 (200,000 pairs) / 0.739456 / sklearn 0.739456

# precision, recall, F1 on ten rows: TP 3 FP 2 FN 1 TN 4 -> 0.6000, 0.7500, 0.6667 = sklearn
# stratified 5-fold by shuffling within each class and splitting: positive rate 0.438 overall, folds 0.436 / 0.440 / 0.440 / 0.440 / 0.434
# a decision stump: root Gini 0.4923; best split feature 0 at −0.1659, weighted child Gini 0.3720; sklearn depth-1 tree: feature 0 at −0.1689 (the midpoint between neighbours)`,
      caption: "Say what each check proves. k-means: the algorithm is right (same inertia) and the objective is non-convex (a bad start is 65 % worse) — hence k-means++ and n_init. AUC: the three definitions are the same quantity — a rank statistic, a pairwise probability, an area — which is the fact behind 'AUC is the probability a random positive outranks a random negative'. The stump: scikit-learn splits at the midpoint between adjacent values; the criterion is the same." },

    { t: "table", head: ["Asked to implement", "Write", "Check against", "Say"], rows: [
      ["Gradient descent", "the gradient, the loop, the rate", "the closed form or sklearn", "convergence needs step < 2/L; the logistic gradient is Xᵀ(p − y)/n"],
      ["k-means", "assign, update, stop on no change", "sklearn's inertia over n_init", "non-convex; k-means++; k by silhouette or the elbow, never by inertia alone"],
      ["AUC", "sort by score, cumulate TPR/FPR, integrate — or the rank formula", "roc_auc_score", "ties get half credit; AUC is the pairwise-ranking probability"],
      ["Cross-validation", "stratified folds by class, a loop that refits everything inside the fold", "StratifiedKFold", "preprocessing inside the fold; time series need forward folds and a gap (10.3)"],
      ["A decision tree", "the impurity, the best split over features and thresholds, recursion with a depth limit", "DecisionTreeClassifier", "Gini versus entropy rarely matters; depth and min samples per leaf do"],
      ["A neural network (11.6)", "forward pass, backward pass with reused δ, the update", "a finite-difference gradient check", "σ′ ≤ 0.25 per layer; ReLU; the check is how you know the backward pass is right"]
    ] },

    { t: "h2", n: "03", text: "The case structure", id: "structure" },

    { t: "code", lang: "text", title: "Six moves, in order",
      code: `1  the question behind the question   what decision will this model change, who acts on it, what does a wrong answer cost, what is known in advance
2  the decision's shape                 batch, real-time or streaming (11.1); horizon; the unit of prediction; the label and when it arrives
3  the baseline                         the rule the business uses now, the seasonal naive, the majority class -- and its number
4  the metric                           the one that matches the decision (2.3, 10.3): cost, precision at a review depth, WAPE and bias, MASE; never accuracy or MAPE by reflex
5  the risks                            leakage (the availability question), the split, drift, fairness, the feedback loop, the human override
6  the plan                             data hygiene, features known at forecast time, the backtest, the rollout (shadow, canary, A/B), the monitors, what to build first`,
      caption: "An interviewer is not looking for the model. They are looking for whether you will find the leak, whether you will measure against the right baseline with the right metric, and whether you know what happens after the model ships. Two sentences per move is enough; the numbers below are what make the sentences specific." },

    { t: "h2", n: "04", text: "Four cases, worked", id: "cases" },

    { t: "dl", items: [
      ["Telecom churn", "**Question behind the question:** who to call, at what cost, to retain how much. **Shape:** nightly batch (11.1: 8.4 ms per row against 1.9 µs per row in batch). **Baseline:** the retention team's current rule; the majority class. **Metric:** expected cost per customer — 2.3's £5 call, £100 loss, 40 % save rate gave a break-even probability of 0.125 and a minimum-cost threshold of 0.15 — and calibration, because the threshold is a probability. **Risks:** leakage from post-churn fields (refunds, cancellation flags; 1.6), preprocessing fitted outside the fold (8.2's SMOTE-before-CV gave 0.998), a threshold that is part of the artefact (11.1: 10 % against 61 % flagged at the same 0.35), and the causal question — the offer's *effect*, which 11.7's uplift model estimated at +3.8 for the top half against +1.7 on average, with a bottom decile the offer harms. **Plan:** hygiene, a pipeline with every transformation inside it, a calibrated logistic model as the yardstick (0.744 AUC on the course data against 0.703 for boosting), SHAP for the retention team's script (9.2), a randomised holdout to measure the offer, an uplift model on it, fairness by group, monitors on the score distribution and the offer's measured effect."],
      ["Real-time fraud", "**Question behind the question:** stop the payment or not, inside the request, with a cost of a false decline and of a missed fraud. **Shape:** real-time scoring under a latency budget — ONNX at 0.25 ms per row (11.1), features from an online store (11.7's arithmetic: 3,000 QPS × 40 features ≈ 1 MB/s in memory), and a review queue for the uncertain middle. **Baseline:** the rules the team runs now — 9.5's two hand rules had precision 0.90 and recall 0.30. **Metric:** precision at the reviewers' depth and recall by fraud pattern (9.5: 0.970 at 200 for the forest, patterns A and B found, C invisible), never accuracy at 1.9 % positives. **Risks:** labels that arrive with chargebacks weeks later, a leak through post-transaction features, a new pattern the model cannot see until its feature exists (9.5: 3 of 240 before, 193 after `new_merch_last_day`), adversarial drift, and the threshold as an artefact. **Plan:** past-only features with the availability assertion, an unsupervised scorer that stays in the loop, analyst labels to a supervised model rank-averaged with it (0.985 precision at 200), shadow then canary with a guardrail on the flagged share (11.1's canary caught a worse model in a median of 6 days), ADWIN on the error stream once labels land, and the miss review that turns chargebacks into features."],
      ["Drift monitoring", "**Question behind the question:** how will we know the model has stopped working before the business does. **Shape:** monitors at every layer (10.9, 11.1): input schema and freshness; feature distributions against a like-for-like reference — PSI needs windows of hundreds (its null mean was 1.22 at 28 rows) and the same season a year earlier (2.42 against the previous quarter, 0.19 against the year before for a 5 % trend, 3.90 across a real shift); a domain classifier for shifts in combinations (AUC 0.922 shifted, 0.485 not); the prediction distribution, which is the drift the decision feels; the error stream when labels arrive (ADWIN fired 71 samples after a concept change and 263 after an input shift that made the problem easier — read the direction); and the business metric with the baseline scored beside the model every day. **Risks:** alarms on p-values with large batches (p = 10⁻⁶ at PSI 0.0007), a reference window that contains the season, refitting on a fault as if it were a change (10.9: refit immediately on a changepoint alarm, diagnose first on an accuracy alarm). **Plan:** the forecast-versus-actual table as the source of every monitor; thresholds on effect sizes; a runbook that says which alarm triggers which action."],
      ["A new problem from nothing", "**Question behind the question:** is there a decision here, and is machine learning the way to improve it. **Shape:** ask what is decided, by whom, how often, with what information available at that moment — the availability question decides the features before any model. **Baseline:** the current practice, measured; if nobody can say what it scores, that measurement is the first deliverable (10.9's seasonal naive at 10.65 % WAPE; 10.3's fold-to-fold spread of 12). **Metric:** chosen from the decision's costs, reported by segment and horizon, with a spread. **Risks:** labels that are not what they seem (11.7's labelling system: the pilot's agreement number decides whether to label at all), a split that interpolates (10.1: 22.3 against 31.3), a model that answers a prediction question when the business asked a causal one (11.7: naive +11.7, true +3.0). **Plan:** the 10.9 sequence — hygiene, a backtest that matches deployment, baselines, the smallest model that beats them, the value-added table — and the honesty to report that the ML step was negative when it was (10.9's boosting at −25.6 % against SARIMAX, and the +5 % override that helped because the model was biased)."]
    ] },

    { t: "ladder",
      title: "Answering 'how would you build a model to predict X'",
      rungs: [
        { level: "bad", label: "Name a model and its hyperparameters", code: `"I'd use XGBoost with early stopping and tune max_depth and the learning rate with Optuna."`,
          note: "**Nothing about the decision, the data available at the moment of prediction, the baseline, the metric or the leak. Every interviewer has heard it; none is convinced by it.**" },
        { level: "ok", label: "Data, split, model, metric, deploy", code: `"Clean the data, split by time, try a linear model and boosting, compare AUC, deploy the winner and monitor it."`,
          note: "The right skeleton. Missing the specifics that show judgement: which leak, which baseline number, which metric matches which cost, which monitor catches which failure." },
        { level: "best", label: "The six moves with numbers from work you have done", code: `"First: what decision changes, and what is known when it is made -- that fixes the features. The baseline is the current rule; I'd measure it (the seasonal naive was 10.65 % WAPE on a case I ran, and the model's whole value is the distance from that). The metric follows the cost: a break-even probability of c/b, so the threshold is 0.125 for a £5 call and a £40 expected saving. The leak to check: anything computed after the event -- I'd assert availability in the pipeline. Rollout: shadow, canary with a guardrail on the flagged share, an A/B sized in advance. Monitors: the prediction distribution and the error stream when labels land. And if the output is an intervention, a randomised holdout first, because the effect is not the prediction."`,
          note: "Specific, sequenced, and every claim has a number behind it." }
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Gradient descent on the linear regression converged to the closed-form solution at learning rates 0.1 and 0.5 and diverged at 1.1. What determines the boundary?",
          options: [
            "The number of features",
            "The largest eigenvalue L of the Hessian (2XᵀX/n for the mean squared error): gradient descent on a quadratic converges only for a step below 2/L, oscillates at the boundary and diverges beyond it — which is why features are standardised, since the eigenvalues then have comparable scale",
            "The intercept",
            "The random seed"
          ],
          answer: 1,
          why: "This is the fact behind every 'why did my training diverge' question, and behind feature scaling: on unscaled features the largest eigenvalue can be enormous, the safe step tiny, and convergence along the small-eigenvalue directions glacial. Adaptive optimisers (Adam) rescale per parameter to soften it."
        },
        {
          stem: "Three AUC implementations — a rank statistic, sampled pairs and the trapezoid under the ROC — agreed to six decimals. Why is that not a coincidence?",
          options: [
            "Because they use the same library",
            "Because they compute the same quantity: the area under the ROC equals the probability that a randomly chosen positive outranks a randomly chosen negative (with ties at half), and the Mann–Whitney U statistic normalised by n₁n₀ is that probability computed from ranks",
            "Because the scores were unique",
            "Because the data were balanced"
          ],
          answer: 1,
          why: "Knowing the three are one thing is what lets you answer 'what does an AUC of 0.74 mean' (a random positive outranks a random negative 74 % of the time), 'why is AUC threshold-free' (it integrates over thresholds), and 'why is it wrong for imbalance at a fixed operating point' (it says nothing about where you will operate)."
        },
        {
          stem: "The churn case's threshold of 0.15 came from a cost model, and the F1-maximising threshold of 0.25 cost more. Why does F1 give a worse threshold?",
          options: [
            "F1 ignores true negatives",
            "F1 weights precision and recall equally, which is the same as treating a wasted £5 call and a missed £100 loss as equally bad; the cost model's break-even c/b = 0.125 encodes the actual ratio, and the minimum-expected-cost threshold (0.15) sits where the marginal call still pays",
            "F1 is not defined at low thresholds",
            "The two thresholds are statistically indistinguishable"
          ],
          answer: 1,
          why: "Every threshold-free metric hides an implicit cost ratio; F1's is one to one. The strong answer states the costs, derives the break-even, and reports the expected cost at the chosen threshold beside precision and recall. That is the question behind 'explain precision and recall'."
        },
        {
          stem: "In the drift case the interviewer asks how you would set the PSI alarm. What is the answer that shows judgement?",
          options: [
            "PSI > 0.2, the industry standard",
            "The reference must be like for like (the same season a year earlier: 0.19 for a 5 % trend, 3.90 across a real shift, but 2.42 against the previous quarter) and the windows large enough that the null PSI is far below the threshold (1.22 at 28 rows, 0.02 at 365 rows with five bins); then 0.2 is a reasonable line — and the prediction distribution's PSI is the one the decision feels",
            "Use a KS test instead",
            "Alarm on any change"
          ],
          answer: 1,
          why: "A threshold without a reference and a sample size is a number without meaning. The executed null values and the seasonal false alarm are the evidence; the strong answer also says what the alarm triggers — diagnosis for an accuracy breach, an immediate refit on truncated history for a confirmed changepoint."
        }
      ] },

    { t: "exercise",
      kind: "Investigate",
      title: "Your own numbers for the classics",
      difficulty: "advanced",
      minutes: 36,
      body: [
        { t: "p", text: "**(a)** Implement gradient descent for linear regression and confirm it matches the closed form; find the largest learning rate that converges on your data and relate it to the largest eigenvalue of 2XᵀX/n." },
        { t: "p", text: "**(b)** Implement k-means with ten random starts and compare the best and worst inertia with scikit-learn's; then implement k-means++ initialisation and report how much the spread across starts shrinks." },
        { t: "p", text: "**(c)** Implement AUC as a rank statistic and as the trapezoid, on scores with ties, and confirm they agree with `roc_auc_score`; then write the two-sentence answer to 'what does AUC mean'." },
        { t: "p", text: "**(d)** Pick one of the four cases and write the six moves in your own words, with one number from this course in each move." }
      ],
      requirements: [
        "(a) the weights, the matching closed form, the rate boundary and the eigenvalue.",
        "(b) best and worst inertia with and without k-means++.",
        "(c) two AUC values that match, and the two sentences.",
        "(d) six moves with six numbers."
      ],
      hint: "(a) The boundary is 2/λ_max. (b) k-means++ picks each new centre with probability proportional to the squared distance from the nearest existing centre. (c) Ties get half credit in both. (d) Use the case tables above; the numbers are there.",
      solution: {
        lang: "python",
        title: "Executed reference (a-c; d is yours)",
        code: `# (a) GD (0.9687, 2.0206, −0.9933, 0.5314) = closed form; learning rate 0.5 converges, 1.1 diverges (MSE 9.9e33 after 100 steps)
#     for the mean squared error the Hessian is 2XᵀX/n; convergence needs lr < 2 / λ_max(2XᵀX/n) -- on standardised features λ_max ≈ 2, so lr < 1

# (b) random starts, best of 10: inertia 1552.23 (= sklearn 1552.23); worst: 2560.05 -- a 65 % worse local minimum from a bad start
#     k-means++ (D² sampling of centres) makes bad starts rare; sklearn uses it by default with n_init=10 -- report your own spread

# (c) rank statistic 0.739456; trapezoid 0.739456; sampled pairs 0.7395; sklearn 0.739456
#     'AUC is the probability that a randomly chosen positive is scored above a randomly chosen negative, ties counting half.
#      It measures ranking over every threshold at once, which is why it says nothing about the threshold you will actually use.'`,
        notes: [
          { t: "p", text: "The from-scratch implementations are the coding round; the check against a reference is what shows you know they are right." },
          { t: "p", text: "The case in your own words is the design round; the numbers are what separate an answer from a recitation." }
        ]
      }
    }
  ],

  takeaways: [
    "The classics are probes for three things — what the metric measures, where the leak is, and that the model is not the decision — and each has a number from this course to say: 0.851 → 0.874 for weight decay, ridge = λ = σ²/τ², break-even p = c/b = 0.125, SMOTE-before-CV at 0.998, 10 % against 61 % flagged at the same threshold.",
    "Gradient descent for linear regression reproduces the closed form to four decimals and diverges above 2/L; logistic regression's gradient is Xᵀ(p − y)/n and matches scikit-learn with and without L2 (C = 1/(λn)).",
    "k-means from scratch matches scikit-learn's inertia and a bad start is 65 % worse; AUC is one quantity three ways (0.739456); precision, recall, stratified folds and a stump all check against their references.",
    "A case answer has six moves — the question behind the question, the decision's shape, the baseline, the metric, the risks, the plan — and two sentences per move with a number in each is the target.",
    "Churn: batch, a cost-derived threshold, the leak in post-event fields, the threshold as part of the artefact, the offer's effect measured by a randomised holdout. Fraud: real-time under a latency budget, precision at the review depth by pattern, labels that arrive late, the feature a new pattern needs. Drift: monitors at every layer with like-for-like references and effect-size thresholds, the baseline scored beside the model. A new problem: measure the current practice first, match the metric to the decision, ask the causal question before the predictive one.",
    "Say the number. Every claim in this course has one behind it, and that is the habit an interview rewards."
  ],

  quiz: {
    title: "The Interview: Classics and Cases — Knowledge Check",
    questions: [
      {
        stem: "An interviewer asks you to explain the bias–variance trade-off. Which answer includes the part most candidates leave out?",
        options: [
          "Bias is under-fitting and variance is over-fitting; use cross-validation",
          "Expected error decomposes into bias², variance and irreducible noise; capacity moves along the curve; and the noise floor bounds what any model can do — so the diagnosis is the train–test gap against the noise level, and the remedies (regularisation, data, ensembling) target the term that is large, as weight decay did in 11.6 (train 1.000 → 0.930, test 0.851 → 0.874)",
          "Bias is bad and variance is good",
          "Deep networks have no bias"
        ],
        answer: 1,
        why: "The noise floor is the forgotten term: a model at the floor cannot improve and effort spent on it is wasted, which is why 10.9's value-added table and 11.4's 0.4 noise sd matter. The executed weight-decay sweep is the trade-off with numbers attached."
      },
      {
        stem: "Asked to implement k-means, you finish and the interviewer asks what could go wrong. Which answer is complete?",
        options: [
          "Nothing — the algorithm always converges",
          "It converges to a local minimum that depends on the start (a bad start was 65 % worse in inertia), so use k-means++ and several restarts; k must be chosen by silhouette or a validation criterion, not by inertia, which always falls with k; and it assumes spherical clusters of similar size and is sensitive to scale and outliers",
          "It needs the number of clusters, and that is all",
          "It is too slow for large data"
        ],
        answer: 1,
        why: "The follow-up is the real question. The from-scratch implementation proves the mechanics; the failure modes — initialisation, choosing k, the spherical assumption, scaling — are what module 7 measured and what a strong answer names unprompted."
      },
      {
        stem: "In the fraud case, the interviewer asks why you would keep an unsupervised scorer after you have labels. What is the evidence-based answer?",
        options: [
          "Unsupervised models are more accurate",
          "Because a supervised model can only find the patterns its labels contain: in 9.5 a new fraud pattern was found by the isolation forest (193 of 240 rows) once its feature existed, while the supervised model with the same feature and no labels for the pattern found 2 — the unsupervised scorer is the detector for what has not been labelled yet",
          "Because labels are always wrong",
          "Because it is cheaper to serve"
        ],
        answer: 1,
        why: "Fraud is adversarial: patterns change faster than labels arrive. The loop in 9.5 — unsupervised queue, analyst labels, supervised model, rank-average, miss review, new features — is the design, and the executed contrast is the argument for its unsupervised half."
      },
      {
        stem: "A case begins 'we want to predict which customers will respond to an offer'. What is the first thing to establish?",
        options: [
          "Which model to use",
          "Whether the business wants a prediction (who will buy) or an effect (whom the offer changes), because they are different questions with different data requirements: a response model targeted the sure things and was uncorrelated (−0.07) with the true effect in 11.7, while an uplift model from a randomised experiment found +3.8 per customer in the top half and a bottom decile the offer harmed",
          "The size of the dataset",
          "The deadline"
        ],
        answer: 1,
        why: "Most 'predict who will respond' briefs are causal questions in disguise, and answering the predictive one well produces a targeting list that wastes the budget on customers who would have bought anyway. Establishing this first changes the data plan: a randomised holdout becomes the first deliverable."
      },
      {
        stem: "What does 'say the number' mean as a habit, and why does it matter in an interview?",
        options: [
          "Memorise benchmark scores",
          "Attach an executed result to every claim — the baseline's WAPE, the leak's inflated score, the threshold and its cost, the monitor's null value — because a number shows the claim was tested rather than recited, and it turns 'I would check for leakage' into 'the shuffled split scored 22.3 against 31.3 forward-only, so I split by time'",
          "Quote the paper",
          "Always give a confidence interval"
        ],
        answer: 1,
        why: "Every lesson in this course produced its numbers by running the code, and the numbers are what make the reasoning checkable. In an interview they do the same job: they are evidence that you have done the work, and they make the conversation about the specifics that show judgement."
      }
    ]
  },

  interview: {
    title: "Interview Questions — The Compendium",
    sub: "Five answers to have ready, each with its numbers.",
    questions: [
      {
        level: "Core",
        q: "Explain the bias–variance trade-off and how you would diagnose which side a model is on.",
        strong: "Expected squared error is bias squared plus variance plus irreducible noise. Bias is the error of the best model in the family — a line fitted to a curve; variance is how much the fitted model changes from sample to sample — a deep tree that memorises. Diagnosis is the gap between training and validation error against the noise floor: high training error near the validation error means bias, a large gap means variance, and both near the noise floor means you are done. The remedies target the term: more capacity or better features for bias; regularisation, more data, ensembling or early stopping for variance. The number I would give: a 256 × 256 network on 200 noisy points scored 1.000 in training and 0.851 on a large test set; weight decay of 1.0 moved that to 0.930 and 0.874 with the weight norm falling from 54 to 5 — variance traded for a little bias, and test error down. And the reminder that the floor exists: on a matrix-factorisation problem with noise sd 0.4 no model could beat an RMSE of 0.4, and the value of further work was zero.",
        answer: [
          { t: "p", text: "The decomposition, the diagnosis from the gap and the floor, targeted remedies, and the executed numbers." }
        ]
      },
      {
        level: "Core",
        q: "How do you handle class imbalance?",
        strong: "First by refusing accuracy: at 2.5 % positives 'always no' scores 97.5 %, and an untreated logistic regression scored the same with 6 % recall. The metric is precision–recall, average precision, recall at a required precision, or expected cost, and the operating point comes from the costs — a break-even probability of c/b, 0.125 for a £5 action against a £40 expected saving. The cheapest treatment is the threshold; the next is class weighting, which shifts a logistic model's intercept by ln(w₊/w₋) and changes the score scale — two churn models with the same AUC flagged 10 % and 61 % of customers at the same threshold, so the threshold is part of the artefact. Resampling — random or SMOTE — can help tree models and has one rule: inside the cross-validation fold, never before, because SMOTE before the split produced an average precision of 0.998 that was pure leakage. And the honest check is a calibration curve on the untouched test set, because every one of these treatments distorts probabilities.",
        answer: [
          { t: "p", text: "The metric, the cost-derived threshold, class weights and the threshold-as-artefact, resampling inside the fold with the leak's number, and calibration." }
        ]
      },
      {
        level: "Senior",
        q: "Walk me through how gradient boosting works and where it fails.",
        strong: "Start from a constant prediction — the mean for squared error, the log-odds of the base rate for logistic loss. At each step compute the negative gradient of the loss at the current predictions — the residuals for squared error, y minus the predicted probability for logistic loss — fit a small tree to it, and add the tree's predictions scaled by a learning rate; the learning rate and the number of trees trade off and are set by early stopping on a validation set, the depth sets the interaction order, and row and column subsampling reduce variance. XGBoost and LightGBM add a second-order step so each leaf value is the Newton solution with an L2 term, histogram binning for speed, and leaf-wise growth. In 6.3 I worked the first steps by hand on a small series and computed each step's optimal multiplier. Where it fails: trees cannot extrapolate, so on a trending series the forecast flattens at the training maximum (10.6: MAE 26.3 against 4.3 with a linear-trend-plus-residual hybrid); on homogeneous inputs like pixels a network wins (11.6); it is sensitive to leaked features because it will find any shortcut (10.3's unshifted rolling mean gave a plausible 7 % gain); and its probabilities need calibration before a threshold is set from costs.",
        answer: [
          { t: "p", text: "The algorithm step by step, the hyperparameters and what they do, the modern additions, the hand-worked reference, and four failure modes with numbers." }
        ]
      },
      {
        level: "Senior",
        q: "Design a system to predict churn and act on it.",
        strong: "The decision is who to call this week and what to offer; it is made nightly, so the model runs in batch — 1.9 µs per row against 8.4 ms per request. Features: everything known at the moment of the call and nothing after — no refunds, no cancellation flags — with the availability assertion in the pipeline. Baseline: the retention team's current rule, measured. Model: a calibrated logistic regression as the yardstick — 0.744 AUC on the course's data, ahead of boosting's 0.703 — with every transformation inside the pipeline, cross-validated with the preprocessing inside the fold. Threshold from costs: a £5 call, a £100 loss, a 40 % save rate give a break-even probability of 0.125 and a minimum-cost threshold of 0.15, and the threshold is versioned with the model because a class-weighted version flagged 61 % of customers where the calibrated one flagged 10 %. Explanation: SHAP contributions on the retention script. Then the part most designs miss: the model predicts churn, not the effect of the call — a randomised holdout measures the offer's effect, an uplift model targets it (top half +3.8 against +1.7 on average, and a bottom decile the offer harms), fairness is reported by group, and the monitors watch the score distribution, the flagged share, the measured effect in the holdout and the baseline beside the model.",
        answer: [
          { t: "p", text: "Shape, features with the availability rule, baseline, a calibrated yardstick with numbers, the cost-derived threshold as an artefact, SHAP, and the causal layer with uplift, fairness and monitors." }
        ]
      },
      {
        level: "Staff",
        q: "You join a team whose model 'stopped working'. What do you do in the first week?",
        strong: "Establish what 'stopped working' means in numbers, then localise. Day one: the forecast-versus-actual or prediction-versus-outcome table — if there is none, building it is the first job — and the baseline scored on the same rows, because a model can look broken when the world got harder for everyone, and it can look fine while a naive rule has caught up. Then the layers, in order of cheapness: inputs (schema, nulls, freshness, duplicates — the hygiene checks; a tripled duplicate count or a partial last day would fire here); feature distributions against a like-for-like reference with enough rows, and the domain classifier for shifts in combinations; the prediction distribution, which is the drift the decision feels; the error stream by segment and horizon, read with its direction (ADWIN fires on a fall in error too); and a changepoint detector on a stationary residual. Then the two failures that are not drift: training–serving skew — I would run the golden rows through the service and expect zero difference — and a threshold or calibrator that was changed without the model or vice versa. What I would find, in my experience of this course's cases: a feed that changed shape, a feature computed differently in serving, a regime change the expanding-window model averages over (+22.8 bias for months), or a population that moved so the queue grew while the model stayed right. The fix follows the diagnosis: retrain on truncated history for a changepoint, fix the pipeline for skew, re-derive the threshold for a moved population, and in every case add the monitor that would have caught it a week earlier.",
        answer: [
          { t: "p", text: "Numbers first with the baseline beside the model, the layered diagnosis with executed alarm behaviour, the two non-drift failures, the typical findings with numbers, and the fix plus the missing monitor." }
        ]
      }
    ]
  }
});

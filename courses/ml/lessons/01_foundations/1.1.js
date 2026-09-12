/* ============================================================================
   LESSON 1.1 — What a Model Learns
   ========================================================================= */
EC.receiveLesson({
  id: "1.1",

  lede: "**A machine-learning model is a function chosen from a family by minimising a loss on data.** That sentence contains the three things every algorithm in this course is made of — a hypothesis space, a loss, and data — and the rest is which family, which loss, and how the minimum is found. This lesson makes each ingredient concrete on five numbers, shows a hand-written rule losing to a fitted model on the course's churn table, and lays out the kinds of learning by the one thing that separates them: what the supervision signal is.",

  objectives: [
    "State Mitchell's definition and map task, experience and performance onto a real problem",
    "Name the three ingredients — hypothesis space, loss, data — and find the minimum by hand on a one-parameter model",
    "Say when learning beats rules and when it does not, and how ML differs from statistics and from deep learning",
    "Distinguish supervised, unsupervised, semi-supervised, self-supervised and reinforcement learning by their supervision signal, with one executed example of each of the first three"
  ],

  prerequisites: [],

  blocks: [

    { t: "h2", n: "01", text: "The definition, and the three ingredients", id: "definition" },

    { t: "p", text: "Tom Mitchell's 1997 definition is the one worth memorising because it is operational: **a program learns from experience E with respect to a task T and a performance measure P if its performance on T, measured by P, improves with E.** For the course dataset — a thousand subscribers of a streaming service, some of whom cancelled — T is 'predict who will cancel next month', E is the labelled history, and P is a metric we will spend all of module 2 choosing. Every 'is this machine learning?' question is answered by finding the three letters." },

    { t: "table",
      head: ["Ingredient", "What it is", "In the churn problem", "Where the course covers it"],
      rows: [
        ["Hypothesis space", "The family of functions the learner may choose from — lines, trees, kernels, networks", "'Churn probability is a logistic function of tenure, logins, tickets and plan'", "Modules 4–7, one family at a time"],
        ["Loss", "A number that says how wrong one candidate is on the data; the learner minimises it", "Cross-entropy between predicted probability and the 0/1 label", "1.8, and each algorithm's own"],
        ["Data", "The experience: rows with features and, for supervised learning, a label", "1,000 customers × 11 columns, 16.2 % churned", "1.2, 1.5, 1.6, module 3"],
        ["Optimiser", "How the minimum is found — closed form, gradient descent, greedy search", "L-BFGS on the cross-entropy", "1.8"],
        ["Performance measure", "How the chosen function is judged on data it did not see — not the loss, usually", "Recall at a threshold the business can afford (2.3)", "Module 2"]
      ]
    },

    { t: "code", lang: "python", title: "The three ingredients on five points: a one-parameter family, a squared loss, and the minimum by hand (executed)",
      hl: [3, 4, 5, 9, 10],
      code: `x = np.array([1, 2, 3, 4, 5]); t = np.array([2.1, 3.9, 6.2, 7.8, 10.1])   # data: five (x, target) pairs

# hypothesis space: every function of the form  y = w * x   (one number to choose)
# loss: mean squared error between w*x and t
for w in [1.5, 2.0, 2.5]:
    print(w, np.mean((w * x - t) ** 2).round(3))        # 1.5 -> 2.812     2.0 -> 0.022     2.5 -> 2.732

# the minimum, by calculus: d/dw mean((wx - t)^2) = 0  ->  w* = (x . t) / (x . x)
w_star = (x @ t) / (x @ x)
print(w_star.round(4), np.mean((w_star * x - t) ** 2).round(4))   # 2.0036   0.0219`,
      caption: "Everything else in the course is this with more parameters, a different loss, or a family where no closed form exists. 'Training' is the search for w*; 'the model' is the function w* x; 'evaluation' is asking how w* x does on a sixth point it never saw."
    },

    { t: "dl", items: [
      ["Model", "One member of the hypothesis space, fixed by its parameters: this line, this tree. Also used loosely for the whole family plus training procedure."],
      ["Parameters", "The numbers training chooses: w above, the coefficients of a regression, the split points of a tree. Learned from data."],
      ["Hyperparameters", "The numbers you choose before training that shape the family or the search: tree depth, regularisation strength, k. Chosen by validation (8.1)."],
      ["Training / fitting", "Minimising the loss over the training data to find the parameters. `fit` in scikit-learn."],
      ["Inference / prediction", "Applying the fitted function to new rows. `predict`, `predict_proba`."],
      ["Generalisation", "Doing well on data not used for training — the only thing that matters, and the reason every lesson holds data back."],
      ["Label / target", "The value to be predicted, present in supervised training data and absent in unsupervised."]
    ]},

    { t: "h2", n: "02", text: "Rules versus learning", id: "rules" },

    { t: "p", text: "Traditional programming takes data and rules and produces answers; learning takes data and answers and produces rules. **The case for learning is not that rules are bad — it is that some rules cannot be written down, change under you, or vary per customer.** A churn analyst's best hand-written rule, against a logistic regression fitted to the same seven columns, on the 300 customers held out:" },

    { t: "code", lang: "python", title: "A hand-written rule against a fitted model on the held-out 300 (executed)",
      hl: [4, 5, 9, 10, 12],
      code: `# held-out set: 300 customers, 16.3 % churned. 'always predict no churn' scores accuracy 0.837 and finds nobody.
rule_a = (X_test.tenure_months < 12) & (X_test.logins_30d < 8)       # the analyst's rule: new and inactive
rule_b = X_test.support_tickets >= 2                                 # a second guess: complainers
#                                         accuracy  precision  recall   F1
# rule A  tenure < 12 and logins < 8        0.833     0.467     0.143   0.219
# rule B  tickets >= 2                      0.747     0.235     0.245   0.240
# always 0                                  0.837     0.000     0.000   0.000

model = LogisticRegression(max_iter=1000).fit(X_train, y_train)
# logistic regression, threshold 0.5           0.847     0.714     0.102   0.179     <- most precise, finds one churner in ten
# logistic regression, threshold 0.25          0.763     0.359     0.571   0.441     <- finds four in seven, at a cost in false alarms
model.coef_.round(3)   # tenure -0.039  logins -0.178  tickets +0.349  discount -0.018  basic -0.087  paid +0.555`,
      caption: "Three things to notice, each a later lesson. Accuracy is useless here because 84 % of customers do not churn — 'always 0' matches the rule (2.1). The model's coefficients are the rule the analyst was trying to write, with the weights learned rather than guessed (4.5). And the threshold, not the model, decides whether you find one churner in ten or four in seven (2.3)."
    },

    { t: "table",
      head: ["Use learning when", "Write rules when"],
      rows: [
        ["The rule cannot be articulated: which pixels make a cat, which phrasing is sarcasm", "The logic is deterministic and known: tax brackets, unit conversion, a contract's terms"],
        ["The rule changes: fraud patterns adapt to whatever you block", "There is no data, or too little to estimate anything"],
        ["The rule varies per context: what to recommend to this person, now", "The decision must be auditable line by line, and a model's reasons would not satisfy the auditor"],
        ["The scale defeats manual rules: a million products, a billion events", "A wrong answer is catastrophic and irreversible, and no human is in the loop"]
      ]
    },

    { t: "table",
      head: ["", "Statistics", "Machine learning", "Deep learning"],
      rows: [
        ["Goal", "Inference: is this effect real, how large, with what uncertainty", "Prediction: how well does it do on new rows", "Prediction from raw signals: pixels, tokens, waveforms"],
        ["Evaluation", "p-values, confidence intervals, goodness of fit", "Held-out data, cross-validation", "Held-out data, at scale"],
        ["Features", "Chosen by the analyst, few, interpretable", "Engineered by the analyst, many", "Learned by the network from raw input"],
        ["Complexity", "As simple as the question allows", "As complex as the validation score justifies", "Millions to billions of parameters"],
        ["Where it wins", "Small data, causal questions, regulated decisions", "Tabular data; most production ML", "Images, language, audio, sequences"]
      ]
    },

    { t: "callout", kind: "mental", title: "Most production ML is a table and a supervised model", body: [
      { t: "p", text: "The headlines belong to deep learning, and the next two courses cover it. **The bulk of deployed models are gradient-boosted trees or logistic regressions on tabular features**, predicting a label that a business already records: churn, fraud, default, click, delay. This course is about doing that well — and the skills transfer, because a network is still a hypothesis space, a loss and data." }
    ]},

    { t: "h2", n: "03", text: "The kinds of learning, by their signal", id: "kinds" },

    { t: "table",
      head: ["Kind", "Supervision signal", "Learns", "Typical output", "Examples"],
      rows: [
        ["Supervised", "A label per row, provided by the world or a labeller", "A mapping from features to label", "Class, probability, or number", "Churn, price, diagnosis; modules 4–6"],
        ["Unsupervised", "None — only the features", "Structure: groups, directions, density, outliers", "Cluster id, projection, anomaly score", "Segmentation, PCA, anomaly detection; modules 7, 9"],
        ["Semi-supervised", "Labels for a few rows, features for many", "A mapping, helped by the shape of the unlabelled data", "As supervised", "Medical images with 1 % labelled; self-training, label propagation"],
        ["Self-supervised", "A label manufactured from the input itself: the masked word, the next token, the other crop", "A representation, later fine-tuned", "Embeddings", "BERT, GPT, SimCLR; the NLP and DL courses"],
        ["Reinforcement", "A reward after actions, often delayed", "A policy: what to do in each state", "Actions", "Games, control, recommendation with explore–exploit (11.4), RLHF"]
      ]
    },

    { t: "code", lang: "python", title: "Supervised, unsupervised and semi-supervised on the same table (executed)",
      hl: [2, 3, 7, 8, 9, 15, 16, 17],
      code: `# supervised: a label exists, learn the mapping. AUC on the held-out 300 (2.2 explains the number)
LogisticRegression(max_iter=1000).fit(X_train, y_train)                 # trained on all 700 labels
#   AUC 0.759

# unsupervised: hide the labels, ask for structure. Three clusters on (monthly_fee, logins_30d), scaled:
km = KMeans(n_clusters=3, n_init=10, random_state=0).fit(Z)
#            basic  plus  pro          <- the clusters against the plan nobody showed the algorithm
# cluster 0    478    18    0          mean fee  8.1   logins  7.7
# cluster 1      0     4  139          mean fee 19.8   logins 19.0
# cluster 2     21   333    6          mean fee 12.8   logins 12.4
# it recovered the three plans from price and behaviour, because that is the strongest structure in those two columns

# semi-supervised: keep 5 % of labels (about 30 rows), treat the rest as unlabelled, let the model label them itself
st = SelfTrainingClassifier(LogisticRegression(max_iter=1000), threshold=0.8).fit(X_train, y_partial)   # -1 = unknown
#   seed 3:  supervised on 34 labels  AUC 0.656      self-training on 34 + 666 unlabelled  AUC 0.689     <- helped
#   seed 1:  supervised on 29 labels  AUC 0.639      self-training                          AUC 0.610     <- hurt
#   the full 700 labels: 0.759. Pseudo-labels are a bet that the confident predictions are right; with thirty labels the bet goes either way.`,
      caption: "The unsupervised result is the one to sit with: nobody told k-means about plans, and it found them, because price and usage are shaped by plan. Unsupervised learning finds the strongest structure in the columns you give it — which may or may not be the structure you wanted. The semi-supervised result is honest: it helped on one seed and hurt on another, and the reference to 'often works' in textbooks should be read as 'often, not always'."
    },

    { t: "viz",
      title: "One table, five signals",
      caption: "The same rows serve every kind of learning; what changes is the column the algorithm is allowed to see and the one it is asked to produce. Reinforcement learning is the odd one out: its data is generated by its own actions.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="Five boxes across: supervised uses features and labels; unsupervised uses features only; semi-supervised uses features and a few labels; self-supervised makes a label from the features; reinforcement learning receives rewards from an environment it acts on.">
  <g stroke-width="1.2">
    <rect x="20" y="40" width="160" height="120" rx="8" style="fill:var(--accent);fill-opacity:.10;stroke:var(--accent)"/>
    <rect x="195" y="40" width="160" height="120" rx="8" style="fill:var(--good);fill-opacity:.10;stroke:var(--good)"/>
    <rect x="370" y="40" width="160" height="120" rx="8" style="fill:var(--accent);fill-opacity:.10;stroke:var(--accent)"/>
    <rect x="545" y="40" width="160" height="120" rx="8" style="fill:var(--warn);fill-opacity:.10;stroke:var(--warn)"/>
    <rect x="720" y="40" width="150" height="120" rx="8" style="fill:var(--crit);fill-opacity:.08;stroke:var(--crit)"/>
  </g>
  <g class="s-label" text-anchor="middle" style="font-weight:600">
    <text x="100" y="64">supervised</text>
    <text x="275" y="64">unsupervised</text>
    <text x="450" y="64">semi-supervised</text>
    <text x="625" y="64">self-supervised</text>
    <text x="795" y="64">reinforcement</text>
  </g>
  <g class="s-mono" text-anchor="middle">
    <text x="100" y="92">X → y</text>
    <text x="275" y="92">X → structure</text>
    <text x="450" y="92">X, few y → y</text>
    <text x="625" y="92">X → part of X</text>
    <text x="795" y="92">state → action</text>
  </g>
  <g class="s-sub" text-anchor="middle">
    <text x="100" y="118">label per row</text>
    <text x="100" y="136">churn, price</text>
    <text x="275" y="118">no label</text>
    <text x="275" y="136">clusters, PCA</text>
    <text x="450" y="118">labels are scarce</text>
    <text x="450" y="136">pseudo-labels</text>
    <text x="625" y="118">label is manufactured</text>
    <text x="625" y="136">next token, masked word</text>
    <text x="795" y="118">reward, delayed</text>
    <text x="795" y="136">policy, explore–exploit</text>
  </g>
  <text x="440" y="200" class="s-sub" text-anchor="middle">supervision signal: given · absent · partial · self-made · earned</text>
  <text x="440" y="228" class="s-sub" text-anchor="middle">this course: supervised and unsupervised in depth; semi- and self-supervised as tools; RL where recommenders meet bandits</text>
</svg>`
    },

    { t: "dl", items: [
      ["Classification vs regression", "Categorical target against continuous target: the loss changes (cross-entropy against squared error), the metrics change, the same families usually serve both."],
      ["Binary, multi-class, multi-label, ordinal", "Two classes; several mutually exclusive classes; several labels per row at once; ordered classes where 'off by one' is less wrong than 'off by four'."],
      ["Self-training", "Fit on the labelled rows, predict the unlabelled, add the confident predictions as labels, refit. `SelfTrainingClassifier` in scikit-learn."],
      ["Label propagation / spreading", "Build a similarity graph over all rows and let labels diffuse along edges. Works when nearby rows share labels."],
      ["Policy, reward, value", "RL's vocabulary: the policy maps states to actions; the reward is the environment's feedback; the value is expected cumulative reward, with future rewards discounted by gamma."],
      ["Explore–exploit", "RL's central tension, and a recommender's: show what is known to work, or try something to learn whether it works better (11.4)."]
    ]},

    { t: "ladder",
      title: "Framing 'reduce churn' as a learning problem",
      rungs: [
        { level: "bad", label: "Predict whether a customer has churned", code: `y = churned            # the column as recorded, at extraction time`,
          note: "**The label is available only after the event**, and half the features — refunds, final invoices — are consequences of it. A model here predicts the past (1.6)." },
        { level: "ok", label: "Predict churn in the next 30 days from features as of today", code: `y = churned_within_30d(as_of)      # features frozen at as_of, label from the window after`,
          note: "**A real prediction task.** Task, experience and performance are defined; the split must respect time (1.5)." },
        { level: "best", label: "…and define P as the decision it drives", code: `P = recall among the top 10 % scored, because 10 % is how many customers retention can call`,
          note: "**The performance measure is the business constraint, not a default metric.** Everything downstream — threshold, class weights, which errors to tolerate — follows from this line (2.3)." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Frame",
      title: "Six problems, three letters each",
      difficulty: "core",
      minutes: 20,
      body: [
        { t: "p", text: "For each problem, write Mitchell's T, E and P; name the kind of learning; say whether the target is classification (which flavour) or regression; and state one reason a hand-written rule would fail." },
        { t: "p", text: "**(a)** Flag a credit-card transaction as fraudulent within 50 ms. **(b)** Group a million support tickets into themes nobody has defined yet. **(c)** Estimate next quarter's revenue per store. **(d)** Rank search results so that people click higher up. **(e)** Label the 40,000 unlabelled X-rays using the 800 a radiologist has read. **(f)** Decide how much to bid for each ad impression, learning from which bids won and converted." }
      ],
      requirements: [
        "T, E, P for all six, with P a measurable quantity, not 'accuracy'.",
        "The kind of learning and the target type for each.",
        "One concrete reason rules fail per problem."
      ],
      hint: "(d) is ranking, a supervised problem with a list-wise metric. (f) has delayed reward and the data depends on the actions — that is the RL signature.",
      solution: {
        lang: "text",
        title: "Framings",
        code: `(a) T: classify a transaction as fraud / not within 50 ms.   E: historical transactions with chargeback outcomes.
    P: recall at a false-positive rate the card-decline budget allows (2.3).   Supervised, binary, heavily imbalanced (8.2).
    Rules fail because fraud adapts to whatever rule is deployed.

(b) T: assign each ticket to one of k themes.   E: the tickets' text, no labels.   P: silhouette or human judgement of a sample (7.3).
    Unsupervised (clustering / topic model, 11.5). Rules fail because the themes are unknown before you look.

(c) T: predict revenue per store for the next quarter.   E: past quarters per store, with calendar and promotions.
    P: MASE against a seasonal-naive baseline over a rolling backtest (10.3).   Supervised regression on a time series (module 10).
    Rules fail because the interactions of season, trend and promotion differ by store.

(d) T: order candidate results for a query.   E: queries with clicked and skipped results.   P: NDCG@10 (2.6).
    Supervised, ranking (a list-wise objective built from pairwise or pointwise labels). Rules fail because relevance is per query and drifts.

(e) T: label X-rays as showing the condition or not.   E: 800 labelled + 40,000 unlabelled images.
    P: recall at a specificity the clinic accepts, on a held-out radiologist-read set.   Semi-supervised (self-training, consistency); in practice self-supervised pre-training then fine-tuning.
    Rules fail because nobody can write the pixel rule.

(f) T: choose a bid per impression.   E: bids placed, whether they won, whether they converted — data the policy itself generated.
    P: conversions per unit spend over a period.   Reinforcement learning / contextual bandit (11.4): delayed reward, explore–exploit.
    Rules fail because the best bid depends on competitors who are also adapting.`,
        notes: [
          { t: "p", text: "**P is the hard letter.** 'Accuracy' is never a complete answer; every P above names a metric and the constraint that fixes its threshold or horizon." },
          { t: "p", text: "**(f) is the one people misfile as supervised.** The training data depends on the actions taken — bids that were never placed have no outcome — which is the reinforcement signature, and why offline evaluation of a bidding policy is hard." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "K-means on (monthly fee, logins) recovered the three subscription plans almost exactly. What does this show about unsupervised learning?",
          options: [
            "It can predict labels without being told them",
            "It finds the strongest structure in the columns it is given — here plan, because plan shapes price and usage — which may or may not be the structure you wanted",
            "It is more accurate than supervised learning",
            "It requires labels after all"
          ],
          answer: 1,
          why: "The clusters were not 'plan'; they were the tightest three groups in a two-dimensional space that happens to be organised by plan. On churn — a weaker signal in those columns — the same clusters would tell you little."
        }
      ]
    }
  ],

  takeaways: [
    "**A model is a function from a family, chosen by minimising a loss on data** — hypothesis space, loss, data; everything else is which and how.",
    "**Mitchell's T, E, P** is the operational definition; P is the letter that takes thought.",
    "**Learning beats rules when the rule cannot be written, changes, varies per context, or does not scale**; rules beat learning when the logic is known, data is absent, or errors are irreversible.",
    "**Statistics asks whether an effect is real; ML asks how well it predicts; DL learns the features too.**",
    "**Most production ML is a supervised model on a table** — this course.",
    "**The kinds of learning differ by supervision signal**: given, absent, partial, self-made, earned.",
    "**Unsupervised learning finds the strongest structure in the columns you give it**, not necessarily the one you wanted.",
    "**Semi-supervised learning is a bet on confident pseudo-labels** — it helped on one seed and hurt on another.",
    "**Accuracy on an imbalanced label matches 'always predict the majority'**; the threshold, not the model, chooses precision against recall.",
    "**Frame the task before the model**: the label must be from after the features, and P must be the decision it drives."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Which of these is a hyperparameter rather than a parameter?",
        options: [
          "The slope of a fitted regression line",
          "The maximum depth of a decision tree — chosen before training and tuned by validation, not learned from the training loss",
          "The split threshold at a tree's root node",
          "A logistic regression's intercept"
        ],
        answer: 1,
        why: "Parameters are what fit sets; hyperparameters shape the family or the search and are set by you, usually via cross-validation (8.1)."
      },
      {
        stem: "A hand-written rule scores 83.3 % accuracy on churn and a model 84.7 %. Why is the comparison uninformative?",
        options: [
          "The model is clearly better",
          "84 % of customers do not churn, so predicting 'no' for everyone scores 83.7 %; both numbers are near the majority baseline and the useful comparison is recall and precision at a chosen threshold",
          "Accuracy cannot be computed for rules",
          "The rule should have used more features"
        ],
        answer: 1,
        why: "The executed 'always 0' baseline was 0.837. Any metric that a constant predictor can score well on is not measuring what you care about (2.1)."
      },
      {
        stem: "What distinguishes self-supervised from unsupervised learning?",
        options: [
          "Nothing; they are synonyms",
          "Self-supervised manufactures a label from the input itself — the masked word, the next token — and trains a supervised objective on it; unsupervised has no label at all and seeks structure directly",
          "Self-supervised requires human labels",
          "Unsupervised is only for images"
        ],
        answer: 1,
        why: "Self-supervision is supervised learning with a free label, which is why it produces representations that fine-tune well. Clustering and PCA never construct a label."
      },
      {
        stem: "When is machine learning the wrong tool?",
        options: [
          "When the data is tabular",
          "When the logic is known and deterministic, there is no data to learn from, every decision must be auditable line by line, or an error is catastrophic with no human in the loop",
          "When the problem is important",
          "When the data is large"
        ],
        answer: 1,
        why: "Learning replaces rules you cannot write. Where you can write them, the rule is cheaper, more auditable and does not drift."
      },
      {
        stem: "Framing 'reduce churn' as 'predict the churned column as recorded' is wrong because…",
        options: [
          "Churn is not predictable",
          "The recorded label is known only after the event, and features extracted at the same time include its consequences (refunds, final invoices) — the model would predict the past; the task must fix an as-of date with features before it and the label after",
          "Logistic regression cannot handle it",
          "The column is imbalanced"
        ],
        answer: 1,
        why: "This is the leakage of 1.6 built into the problem statement. The fix is temporal framing, then a split that respects it."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "What is the difference between supervised, unsupervised and reinforcement learning?",
        strong: "They differ in the supervision signal. Supervised learning has a label per row and learns a mapping from features to label — classification or regression; churn, price. Unsupervised has only features and finds structure — clusters, principal directions, density, anomalies; the structure it finds is the strongest one in the columns given, which is not always the one wanted. Reinforcement learning has neither labels nor a fixed dataset: an agent acts, receives delayed rewards, and learns a policy; the data depends on its own actions, which makes evaluation hard and exploration necessary. Between the first two sit semi-supervised, which uses a few labels plus many unlabelled rows, and self-supervised, which manufactures labels from the input — the foundation of modern language models.",
        answer: [
          { t: "p", text: "Naming the signal as the distinguishing feature, and placing semi- and self-supervised correctly, is the complete answer." }
        ]
      },
      {
        level: "core",
        q: "When would you not use machine learning?",
        strong: "When the rule is known and deterministic — a tax calculation — because a rule is cheaper, exact and auditable. When there is no data, or so little that any fitted function is noise. When each decision must be explained line by line to a regulator and the model's explanation would not satisfy them. When an error is catastrophic and irreversible with no human review. And, practically, when a simple heuristic already meets the requirement: the first thing to build is the baseline, and sometimes the baseline is the product.",
        answer: [
          { t: "p", text: "Ending with 'sometimes the baseline is the product' signals judgement rather than enthusiasm." }
        ]
      },
      {
        level: "advanced",
        q: "How is machine learning different from statistics?",
        strong: "Mostly in what question is being asked. Statistics asks whether a relationship is real and how large it is, with uncertainty — inference — so it prefers simple, interpretable models evaluated by p-values and confidence intervals, and it cares about the assumptions that make those valid. Machine learning asks how well a function predicts new rows, so it tolerates complexity that validation justifies and evaluates by held-out performance; assumptions matter only insofar as they affect that. The tools overlap almost entirely — a logistic regression is both — and the honest answer is that a good practitioner uses the statistical view to understand and the ML view to deploy, and knows that a model can predict well while every coefficient is causally meaningless.",
        answer: [
          { t: "p", text: "The last clause — predicts well, coefficients causally meaningless — is the point that separates a considered answer from a table." }
        ]
      }
    ]
  }
});

/* ============================================================================
   LESSON 5.2 — Naive Bayes
   ========================================================================= */
EC.receiveLesson({
  id: "5.2",

  lede: "**Naive Bayes turns Bayes' theorem into a classifier by making one assumption that is almost always false — that the features are independent given the class — and it works anyway, because classification needs the right argmax, not the right probability.** This lesson computes a spam filter by hand on eight messages (posterior 0.9796 for 'win cash now', and exactly 0 for the ham class without smoothing), works a Gaussian row on the churn data to the fourth decimal, and then shows what the false assumption costs and where: duplicating one feature nine times moved the AUC from 0.735 to 0.686 but the log-loss from 0.42 to 1.21 — the ranking survives, the confidence does not. On text it is the model to beat with little data: 65 % accuracy from forty training documents where logistic regression managed 41 %, fitted in 4 ms against 435.",

  objectives: [
    "Derive the classifier from Bayes' theorem and the conditional-independence assumption, and compute a posterior by hand",
    "Apply Laplace smoothing and log-space arithmetic, and explain the failure each prevents",
    "Choose between Gaussian, multinomial, Bernoulli and complement variants by feature type",
    "Explain why correlated features damage calibration more than accuracy, and when Naive Bayes beats a discriminative model"
  ],

  prerequisites: ["1.4", "4.5", "2.5"],

  blocks: [

    { t: "h2", n: "01", text: "From Bayes' theorem to a classifier", id: "bayes" },

    { t: "code", lang: "text", title: "Three lines of derivation and one assumption",
      code: `Bayes' theorem:      P(y | x) = P(y) P(x | y) / P(x)

P(x) is the same for every class, so for the argmax it can be dropped:
                     ŷ = argmax_y  P(y) · P(x₁, x₂, ..., xₚ | y)

P(x₁, ..., xₚ | y) is a joint distribution over p features -- impossible to estimate from data for p beyond a handful.
THE NAIVE ASSUMPTION: given the class, the features are independent:   P(x₁, ..., xₚ | y) = Πⱼ P(xⱼ | y)

                     ŷ = argmax_y  P(y) · Πⱼ P(xⱼ | y)          <- a prior times p one-dimensional likelihoods, each estimated by counting or by a mean and a variance

in log space (always, in practice):    score(y) = ln P(y) + Σⱼ ln P(xⱼ | y)         posterior = softmax over the scores

generative, not discriminative: it models how each class GENERATES the features, P(x | y), and inverts with Bayes.
logistic regression (4.5) models P(y | x) directly and never says anything about P(x).`,
      caption: "The assumption is what makes the problem tractable: instead of one p-dimensional density per class you estimate p one-dimensional ones, each from a count or a mean and variance, in one pass over the data. It is wrong whenever features carry overlapping information — 'cash' and 'prize' co-occur in spam far more than independence would predict — and section 03 measures what that costs."
    },

    { t: "code", lang: "text", title: "A spam filter by hand: eight training messages, vocabulary of 17 words (executed)",
      code: `spam (4 docs, 15 words):  win cash prize now | cash prize claim now | win win lottery cash | claim your prize
ham  (4 docs, 15 words):  meeting agenda for monday | lunch on monday | agenda attached see you | see you at lunch

query: "win cash now"           prior P(spam) = P(ham) = 4/8 = 0.5

multinomial likelihood P(w | class) = count(w, class) / total words in class                          with add-α smoothing:  (count + α) / (total + α·V)

WITHOUT smoothing (α = 0):
   spam:  win 3/15 = 0.200   cash 3/15 = 0.200   now 2/15 = 0.133      score = ln 0.5 + ln 0.2 + ln 0.2 + ln 0.133 = -5.927
   ham:   win 0/15 = 0       cash 0/15 = 0       now 0/15 = 0          score = -∞           <- one unseen word zeroes the whole product
   'win' never appeared in ham, so ham is IMPOSSIBLE -- not unlikely, impossible. Every future ham message containing 'win' is spam with certainty.

WITH Laplace smoothing (α = 1, V = 17):
   spam:  win (3+1)/(15+17) = 0.1250   cash 0.1250   now (2+1)/32 = 0.0938      score = ln 0.5 + ln 0.125 + ln 0.125 + ln 0.0938 = -7.219
   ham:   win (0+1)/32 = 0.0313        cash 0.0313   now 0.0313                 score = ln 0.5 + 3 ln 0.0313 = -11.090
   posterior: e^{-7.219} / (e^{-7.219} + e^{-11.090}) = 0.9796 spam          scikit-learn MultinomialNB(alpha=1): 0.9796

query "claim lunch" (one word seen only in each class):  posterior [0.5, 0.5] -- the evidence cancels exactly`,
      caption: "Every number is a count divided by a count, which is why the model fits in one pass and updates by incrementing counters. Smoothing is not optional: without it any word absent from a class's training text becomes a veto, and a spam filter that has never seen 'win' in ham will classify 'win a free lunch on Monday' as spam with probability 1. α = 1 pretends each word was seen once in every class; smaller α trusts the data more (0.1 is the usual text default) and the choice is a hyperparameter to tune."
    },

    { t: "dl", items: [
      ["Prior P(y)", "The class frequency in training (or set by hand). With 15.4 % churners the prior alone gives log-odds −1.70 against churn before any feature is read."],
      ["Likelihood P(xⱼ | y)", "One-dimensional per feature per class. Counted (multinomial, Bernoulli) or Gaussian (mean and variance per class). The only thing the model learns."],
      ["Posterior P(y | x)", "Prior × likelihoods, normalised over classes. The argmax is the prediction; the value is a probability only if the assumption holds (it does not)."],
      ["Laplace / Lidstone smoothing", "(count + α)/(total + αV). α = 1 is Laplace; α < 1 is Lidstone. Prevents a single unseen value from zeroing a class."],
      ["Log space", "Sum log-probabilities instead of multiplying probabilities: 0.01²⁰⁰ underflows to 0.0 in floating point; 200 × ln 0.01 = −921.0 does not. Every implementation does this."],
      ["Generative model", "Learns P(x | y) and P(y); can generate features, handle missing ones by marginalising, and learn from little data. Logistic regression is the discriminative counterpart with the same linear decision boundary."],
      ["Complement NB", "Estimates each class's word distribution from the *other* classes' documents. More stable on imbalanced text; 0.912 against multinomial's 0.906 below."]
    ]},

    { t: "h2", n: "02", text: "Variants: pick by feature type", id: "variants" },

    { t: "table",
      head: ["Variant", "Feature type", "P(xⱼ | y)", "Parameters per class", "Use for"],
      rows: [
        ["Gaussian", "Continuous", "N(μⱼᵧ, σ²ⱼᵧ)", "2p", "Numeric tables; a fast baseline; needs roughly bell-shaped features within class"],
        ["Multinomial", "Counts (words, events)", "Multinomial over the vocabulary", "V", "Text with counts or tf-idf; the standard text baseline"],
        ["Bernoulli", "Binary presence/absence", "Bernoulli per feature; absences count as evidence too", "V", "Short texts, binary indicators; 0.836 on the newsgroups below — presence loses the repetition signal"],
        ["Complement", "Counts, imbalanced classes", "Multinomial on the complement class", "V", "Imbalanced text; often ≥ multinomial"],
        ["Categorical", "Nominal codes", "One categorical per feature", "Σ levels", "Tables of categoricals without one-hot (`CategoricalNB`)"]
      ]
    },

    { t: "code", lang: "python", title: "Gaussian NB on the churn numerics, and one row worked to the fourth decimal (executed, 863 rows)",
      hl: [3, 4, 11, 12, 13],
      code: `GaussianNB().fit(X, y)          # learns, per class, a mean and a variance for each of 5 features -- 20 numbers plus 2 priors
# class means   (no churn / churn):  tenure 32.3 / 22.6    fee 12.09 / 9.89    logins 11.7 / 8.4    tickets 0.74 / 1.09    discount 2.67 / 2.71
# class sds:                         tenure 17.3 / 16.0    fee  4.32 / 2.85    logins  5.1 / 3.7    tickets 0.84 / 1.02    discount 5.67 / 5.64
# priors: 0.846 / 0.154

# row 0: tenure 38, fee 13.17, logins 10, tickets 2, discount 0 (true label: no churn)
#   score(no churn) = ln 0.846 + Σⱼ ln N(xⱼ; μⱼ₀, σⱼ₀²) = -0.167 + (-13.474) = -13.641
#   score(churn)    = ln 0.154 + Σⱼ ln N(xⱼ; μⱼ₁, σⱼ₁²) = -1.870 + (-13.197) = -15.067
#   P(no churn | x) = 1 / (1 + e^{-(score₀ - score₁)}) = 1 / (1 + e^{-1.426}) = 0.8063      predict_proba: [0.8063, 0.1937]

# 5-fold:   GaussianNB   AUC 0.7350   log-loss 0.4240   Brier 0.1238
#           logistic     AUC 0.7566   log-loss 0.3720   Brier 0.1132
# discount_pct takes the values {0: 686 rows, 10: 123, 20: 54} -- a Gaussian with mean 2.7 and sd 5.7 is a poor description of that`,
      caption: "Twenty-two numbers and no optimisation, and it lands 0.02 AUC behind logistic regression. The gap has two sources: the independence assumption (tenure and logins are correlated within class), and the Gaussian assumption on features that are not Gaussian — tickets is a Poisson count and discount is three spikes. The fixes are a transform (3.1's power transform, or log for skew), discretising into a categorical NB, or accepting the baseline for what it is: instant, and within a few points of the tuned model."
    },

    { t: "h2", n: "03", text: "What the naive assumption costs, measured", id: "cost" },

    { t: "code", lang: "python", title: "The same feature counted several times: duplicate the tickets column and refit (executed)",
      hl: [2, 5, 6],
      code: `#   tickets duplicated     AUC      log-loss    share of p̂ > 0.9 or < 0.1    top-quintile: predicted vs actual churn rate
#   0×  (the real model)   0.7350    0.4240            0.404                      0.511 vs 0.347
#   1×                     0.7295    0.4441            0.451                      0.561 vs 0.312
#   4×                     0.7084    0.6465            0.692                      0.732 vs 0.283
#   9×                     0.6857    1.2089            0.888                      0.860 vs 0.260
# the ranking drifts by 0.05 AUC; the log-loss triples; nine-tenths of the predictions become near-certain, and the top quintile is
# predicted at 86 % churn against an actual 26 %`,
      caption: "A duplicated feature is the limiting case of a correlated one: the model counts the same evidence ten times and multiplies ten likelihoods where it should apply one. The class order barely changes — the same rows still score highest — so accuracy and AUC survive; the *magnitude* of the log-odds is inflated tenfold, so every probability is pushed toward 0 or 1. **Naive Bayes ranks better than it calibrates.** Use its labels or its ranking; if you need its probabilities, calibrate them (2.5) — isotonic calibration below took the text model's log-loss from 0.645 on counts to 0.254."
    },

    { t: "callout", kind: "insight", title: "Why the wrong assumption still finds the right class", body: [
      { t: "p", text: "Classification is an argmax. The posterior P(y | x) can be badly wrong in value and still be largest for the right class, because the errors introduced by double-counting affect every class's score in similar proportion: the log-odds are scaled, not reordered. What breaks the argmax is *asymmetric* dependence — features that are correlated within one class and not the other — and features whose one-dimensional likelihood is badly modelled (a Gaussian on three spikes). What never breaks is the speed: one pass, no iterations, no convergence, and a model that updates with a counter increment. Those are the properties that make it the reference baseline for text, and the properties that make it the wrong final model for a calibrated risk score." }
    ]},

    { t: "code", lang: "python", title: "Text: four newsgroups, 3,916 documents, vocabulary 18,546 (executed)",
      hl: [3, 4, 5, 9, 10, 15, 16],
      code: `# learning curve, test accuracy on 1,175 held-out documents, word counts
#   training docs     MultinomialNB    logistic regression (C = 10)
#        40              0.650              0.411          <- with ten documents per class, NB has already learned the vocabulary's class frequencies
#       100              0.768              0.564
#       300              0.860              0.739
#     1,000              0.894              0.822
#     2,741              0.906              0.860          fit time: NB 4 ms, logistic 435 ms

# variants and inputs, full training set
#   MultinomialNB on counts 0.906     ComplementNB 0.912     BernoulliNB 0.836     MultinomialNB on sublinear tf-idf 0.911     logistic on tf-idf 0.894
#   alpha:  0.001 → 0.901   0.01 → 0.906   0.1 → 0.906   1 → 0.907   10 → 0.883

# calibration: NB is accurate and over-sure
#   MultinomialNB on counts:   accuracy 0.906   mean max-probability 0.958   log-loss 0.645
#   on sublinear tf-idf:       accuracy 0.911   mean max-probability 0.871   log-loss 0.243     <- damping repeated words damps the double-counting
#   isotonic-calibrated:       accuracy 0.912                                log-loss 0.254
# most indicative words:  hockey: nhl, det, tor, nyi   med: candida, diseases, tobacco, hiv   space: shuttle, orbit, spacecraft, mars   mideast: armenian, turkish, israeli`,
      caption: "With forty documents NB is at 65 % and logistic regression at 41 %: the generative model needs only class word frequencies, which forty documents already estimate roughly, while the discriminative model needs enough data to place 18,546 coefficients. The gap closes with data and reverses on harder problems, which is the general pattern — generative models reach their (higher) asymptotic error faster, discriminative models reach a lower one slower. Sublinear tf-idf is a cheap fix for the over-confidence: a word repeated five times in a document is five correlated pieces of evidence, and log(1 + tf) stops counting it five times."
    },

    { t: "table",
      head: ["", "Naive Bayes", "Logistic regression (4.5)"],
      rows: [
        ["Models", "P(x | y) and P(y) — generative", "P(y | x) — discriminative"],
        ["Decision boundary", "Linear in the features (Gaussian with shared variance; multinomial in log-counts)", "Linear"],
        ["Fitting", "Counting; one pass; 4 ms", "Convex optimisation; iterative; 435 ms"],
        ["Data needed", "Little: 65 % from 40 documents", "More: 41 % from 40, 86 % from 2,741"],
        ["Correlated features", "Double-counts them: over-confident probabilities", "Shares the weight; probabilities stay calibrated"],
        ["Probabilities", "Ranking good, calibration poor; calibrate before use", "Usually calibrated"],
        ["Missing features", "Drop the term from the product", "Needs imputation"],
        ["Online / streaming", "`partial_fit` by incrementing counts", "SGD variant"]
      ]
    },

    { t: "ladder",
      title: "A support-ticket router: 12 categories, 3,000 labelled tickets, new tickets arriving continuously",
      rungs: [
        { level: "bad", label: "Gaussian NB on tf-idf", code: `GaussianNB().fit(tfidf.toarray(), category)`,
          note: "**The wrong likelihood**: tf-idf columns are sparse and skewed, not bell-shaped, and `.toarray()` on 20,000 columns materialises a matrix that need not exist." },
        { level: "ok", label: "Multinomial NB on counts, α tuned, labels used", code: `make_pipeline(CountVectorizer(min_df=2, stop_words="english"), MultinomialNB(alpha=0.1))   # alpha by CV; route by predict()`,
          note: "**The right variant, fast, and 90 %-accurate from a few thousand tickets.** But the router also shows a confidence to the agent, and NB's 0.96 mean confidence is a lie." },
        { level: "best", label: "Complement NB on sublinear tf-idf, calibrated, with partial_fit for the stream", code: `pipe = make_pipeline(TfidfVectorizer(sublinear_tf=True, min_df=2), ComplementNB(alpha=0.1))
cal = CalibratedClassifierCV(pipe, method="isotonic", cv=5).fit(tickets, category)   # confidence shown to agents is now honest
# new labelled tickets: refit nightly (seconds), or partial_fit the NB on the fixed vocabulary between refits`,
          note: "**Imbalance-stable, over-confidence damped twice (sublinear tf, then calibration), and cheap enough to refit whenever the queue changes** — the honest version of the baseline." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Compute",
      title: "A posterior by hand, a variance you must justify, and a duplication you must explain",
      difficulty: "core",
      minutes: 28,
      body: [
        { t: "p", text: "**(a)** Using the eight training messages, classify \"free lunch monday\" with α = 1 (note that 'free' is not in the vocabulary — decide and justify how to treat it), showing the smoothed likelihoods, the log-scores and the posterior; then repeat with α = 0.1 and explain the change. **(b)** For row 0 of the churn data, recompute the Gaussian log-likelihood of the tickets feature alone under each class (μ 0.74/1.09, σ 0.84/1.02) and state which class it favours and by how much in log-odds; then say what a Poisson likelihood with the same means would give instead. **(c)** Reproduce the duplication experiment with a *different* feature duplicated four times and report AUC, log-loss and the share of extreme probabilities; explain why AUC moves less than log-loss." }
      ],
      requirements: [
        "(a) the treatment of the unseen word, both posteriors, and the α comparison.",
        "(b) the two Gaussian log-likelihoods, the log-odds, and the Poisson alternative.",
        "(c) the three numbers and the mechanism."
      ],
      hint: "(a) A word absent from the training vocabulary contributes nothing under either class — drop it; scikit-learn's vectoriser does the same. (b) ln N(x; μ, σ²) = −½ ln(2πσ²) − (x − μ)²/(2σ²). Poisson: x ln μ − μ − ln x!. (c) Extreme probabilities change the loss but not the order.",
      solution: {
        lang: "python",
        title: "nb_practice.py",
        code: `# (a) "free lunch monday": 'free' is out of vocabulary -> it has no likelihood under either class and is dropped. V stays 17.
#   alpha = 1:   spam: lunch (0+1)/32 = 0.03125, monday 0.03125         score = ln 0.5 + 2 ln 0.03125 = -7.624
#                ham:  lunch (2+1)/32 = 0.09375, monday (2+1)/32 = 0.09375   score = ln 0.5 + 2 ln 0.09375 = -5.427
#                posterior ham = 1 / (1 + e^{-(5.427 - 7.624)·(-1)}) = 1 / (1 + e^{-2.197}) = 0.900
#   alpha = 0.1: spam: (0+0.1)/(15+1.7) = 0.00599 each     ham: (2+0.1)/16.7 = 0.1257 each
#                log-odds ham vs spam = 2 ln(0.1257/0.00599) = 2 × 3.044 = 6.09  -> posterior ham 0.9977
#   smaller alpha trusts the observed zero more, so the absent words count as stronger evidence against spam. Both are 'ham'; only the confidence differs.

# (b) tickets = 2 for row 0
#   class 0: -0.5 ln(2π · 0.84²) - (2 - 0.74)² / (2 · 0.84²) = -0.744 - 1.125 = -1.869
#   class 1: -0.5 ln(2π · 1.02²) - (2 - 1.09)² / (2 · 1.02²) = -0.938 - 0.398 = -1.336
#   log-odds for churn from this feature alone: -1.336 - (-1.869) = +0.533  (two tickets favour churn, e^0.533 = 1.7× on the odds)
#   Poisson with the same means: class 0: 2 ln 0.74 - 0.74 - ln 2 = -2.036 ;  class 1: 2 ln 1.09 - 1.09 - ln 2 = -1.611 ; log-odds +0.425
#   same direction, smaller magnitude: the Gaussian's thin tail over-penalises a count of 2 under the low-mean class. For a count, the Poisson is the honest likelihood.

# (c) logins_30d duplicated four times (executed):  AUC 0.7205 (from 0.7350)   log-loss 0.8963 (from 0.4240)   share of p̂ outside (0.1, 0.9): 0.542 (from 0.404)
#   mechanism: the duplicated likelihood multiplies that feature's log-odds contribution by five. Rows are re-ordered only where logins was
#   the deciding feature, so the AUC (an ordering) moves by 0.015; every probability is pushed toward the extremes, and log-loss punishes
#   confident errors without limit, so it doubles.`,
        notes: [
          { t: "p", text: "**(a)** shows α as a dial on how much an *absence* counts. It also shows that the vocabulary is part of the model: an unseen word is silently ignored, which is a limitation to know about." },
          { t: "p", text: "**(b)** is the Gaussian assumption examined one feature at a time — the way to find which features are hurting a Gaussian NB and to decide whether to transform them or switch likelihood." },
          { t: "p", text: "**(c)** is the calibration-versus-ranking distinction in one experiment: the model you can rank with is not yet the model you can quote a probability from." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Without smoothing, the ham score for 'win cash now' was −∞. What exactly went wrong, and what does α = 1 change?",
          options: [
            "Underflow in floating point",
            "'win', 'cash' and 'now' never appeared in ham, so each likelihood was 0/15 = 0 and the product was exactly 0 — the model declared ham impossible on the strength of an absence in fifteen words. Add-one smoothing pretends every vocabulary word was seen once per class, (count + 1)/(total + 17), so an unseen word is merely unlikely (0.031) and the posterior is 0.98 rather than 1",
            "The prior was wrong",
            "The vocabulary was too small"
          ],
          answer: 1,
          why: "Underflow is the other failure (0.01²⁰⁰ = 0.0) and log space is its fix; zero counts are fixed by smoothing."
        }
      ]
    }
  ],

  takeaways: [
    "**ŷ = argmax P(y) Π P(xⱼ | y)**: Bayes' theorem with P(x) dropped and the joint likelihood factorised by assuming conditional independence.",
    "**Generative, one pass, counts and means** — 4 ms against 435 for logistic regression on 18,546 words.",
    "**Smoothing prevents a veto**: without it one unseen word makes a class impossible (−∞); with α = 1 the spam posterior was 0.9796, matching scikit-learn.",
    "**Log space prevents underflow**: 0.01²⁰⁰ = 0.0 in floating point; the log-sum is −921.",
    "**Variant by feature type**: Gaussian for continuous (check the shape — discount is three spikes), multinomial for counts, Bernoulli for presence, complement for imbalanced text.",
    "**The assumption costs calibration, not ranking**: tickets duplicated 9× moved AUC 0.735 → 0.686 and log-loss 0.42 → 1.21; the top quintile was predicted at 86 % against an actual 26 %.",
    "**Calibrate before quoting a probability**: isotonic took the text model's log-loss from 0.645 to 0.254; sublinear tf-idf alone took it to 0.243.",
    "**It wins with little data**: 65 % from 40 documents against 41 % for logistic regression; the gap closes with data.",
    "**Same linear boundary as logistic regression, different route** — generative models reach their asymptote faster; discriminative models reach a lower one.",
    "**Use it as the text baseline, the streaming classifier, and the fast first model** — not as the source of a risk probability."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why is Naive Bayes 'naive', and why does it work despite that?",
        options: [
          "Because it uses a simple prior",
          "It assumes features are conditionally independent given the class, so the joint likelihood factorises into one-dimensional pieces; this is nearly always false, but classification is an argmax — double-counting correlated evidence scales every class's log-score without usually reordering them, so the label survives while the probability becomes over-confident",
          "Because it ignores the prior",
          "Because it is linear"
        ],
        answer: 1,
        why: "Nine copies of one feature: AUC fell 0.05, log-loss tripled. The wrongness lands on calibration."
      },
      {
        stem: "Which variant, and why, for (i) e-mail word counts, (ii) a table of sensor readings, (iii) binary 'symptom present' flags?",
        options: [
          "Gaussian for all three",
          "(i) Multinomial (or complement if classes are imbalanced), because the likelihood of a document is a multinomial over word counts; (ii) Gaussian, with skewed readings transformed first, because the likelihood is a per-class normal; (iii) Bernoulli, because presence and absence are both evidence and a Bernoulli models each flag",
          "Multinomial for all three",
          "Bernoulli for (i), multinomial for (ii) and (iii)"
        ],
        answer: 1,
        why: "The variant is the likelihood model; choose it by what the feature is, not by habit."
      },
      {
        stem: "Naive Bayes beat logistic regression 0.650 to 0.411 with 40 training documents and 0.906 to 0.860 with 2,741. Explain.",
        options: [
          "Logistic regression is the wrong model for text",
          "Naive Bayes only needs class word frequencies, which a handful of documents already estimate roughly, so it reaches a usable model almost immediately; logistic regression must place 18,546 coefficients from the labels and needs far more data to do so. Generative models converge faster to a higher asymptotic error; discriminative models converge slower to a lower one — with more data and tf-idf the gap closes (0.911 vs 0.894)",
          "Naive Bayes overfits less because it has fewer parameters",
          "The vocabulary was too large for logistic regression"
        ],
        answer: 1,
        why: "The learning curve is the diagnostic: if you have little data, the generative baseline is not just a baseline."
      },
      {
        stem: "A stakeholder wants Naive Bayes's predicted probability of spam shown to users. What do you say?",
        options: [
          "Show it; NB outputs probabilities",
          "Not the raw value: NB's posteriors are systematically over-confident under correlated features (mean max-probability 0.958 at 90.6 % accuracy; top-quintile predicted 86 % against actual 26 % in the duplication experiment). Calibrate with isotonic or Platt scaling on held-out data (log-loss 0.645 → 0.254), or damp the double-counting with sublinear tf-idf, and check a reliability curve before showing anything",
          "Show it only for spam",
          "Use the log-score instead"
        ],
        answer: 1,
        why: "The ranking is trustworthy; the number is not until it has been calibrated."
      },
      {
        stem: "How does Gaussian NB compute P(x | y) for a row, and what does it assume that the churn features violate?",
        options: [
          "It uses a single multivariate normal per class",
          "For each feature and class it stores a mean and variance and evaluates a one-dimensional normal density, summing the logs across features: row 0 scored −13.641 against −15.067 for a posterior of 0.8063. It assumes each feature is bell-shaped within class; tickets is a Poisson count and discount takes three values, so those likelihoods are badly modelled — transform, discretise, or switch variant",
          "It counts feature values",
          "It assumes features are uniform"
        ],
        answer: 1,
        why: "A multivariate normal per class would be quadratic discriminant analysis (7.5's LDA is the shared-covariance version); Naive Bayes is the diagonal special case."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Explain Naive Bayes and walk through a classification by hand.",
        strong: "Bayes' theorem gives P(y | x) proportional to P(y) P(x | y); the joint likelihood over all features is unlearnable, so Naive Bayes assumes the features are independent given the class and factorises it into a product of one-dimensional likelihoods, each estimated by counting or by a class mean and variance. Prediction is the argmax of the prior times those likelihoods, computed as a sum of logs to avoid underflow. On eight training messages, four spam and four ham with fifteen words each, the query 'win cash now' has smoothed spam likelihoods (3+1)/(15+17) = 0.125 for 'win' and 'cash' and 3/32 for 'now', ham likelihoods of 1/32 each because none of the words appeared in ham, and log-scores of −7.22 against −11.09, a posterior of 0.98 for spam. Without smoothing the ham likelihoods are zero and ham is impossible — one absence vetoes the class — which is why add-α smoothing is mandatory. It is generative: it models how each class produces features, fits in one pass, updates by incrementing counts, and is the baseline for text.",
        answer: [
          { t: "p", text: "Derivation, assumption, the worked posterior with its numbers, smoothing, log space, and the generative framing." }
        ]
      },
      {
        level: "core",
        q: "Naive Bayes versus logistic regression: when would you use which?",
        strong: "They share a linear decision boundary but arrive differently: Naive Bayes is generative and estimates P(x | y) by counting, logistic regression is discriminative and fits P(y | x) by optimisation. That gives Naive Bayes three advantages — it is orders of magnitude faster, it works with very little data because class frequencies are estimable from a few examples (65 % accuracy from forty documents where logistic regression managed 41 %), and it handles missing features and streaming updates naturally. Its disadvantages come from the independence assumption: correlated features are double-counted, so its probabilities are over-confident even when its labels are right — duplicating one churn feature nine times tripled the log-loss while the AUC fell only 0.05 — and it cannot learn interactions or share weight between related features as a fitted model can. So: Naive Bayes as the text baseline, for small data, for a streaming or embedded classifier, and whenever I need labels or a ranking fast; logistic regression when I have enough data, need calibrated probabilities or coefficients I can defend, or have correlated features. And if I must show Naive Bayes's probability, I calibrate it first.",
        answer: [
          { t: "p", text: "Generative versus discriminative, the three advantages with numbers, the calibration cost with numbers, and the decision rule." }
        ]
      },
      {
        level: "advanced",
        q: "Your Naive Bayes spam filter has 97 % accuracy but users complain that obvious spam gets through with '2 % spam' shown next to it. Diagnose.",
        strong: "Two separate things. The confidence display is the easy one: Naive Bayes posteriors are not calibrated — with correlated words the model multiplies evidence it should count once and pushes every score toward 0 or 1, so '2 %' means 'ranked low', not 'two in a hundred'. I would calibrate the scores on held-out mail with isotonic regression or Platt scaling and show the calibrated number, or show no number. The misses are the more interesting problem. If the spam that gets through uses words the model has never seen, they are silently dropped — the vocabulary is part of the model — and the message is judged on its remaining, ham-looking words; that argues for retraining on recent mail, character n-grams so novel spellings still carry evidence, and a lower α so absences count more. If the missed spam is short, Bernoulli or multinomial behave differently on presence versus counts and I would check which is in use. If the spam class is small relative to ham, the prior drags everything toward ham and complement NB or a prior adjustment helps. And I would look at the threshold: 97 % accuracy on a mostly-ham stream says little about spam recall, so I would report precision and recall per class and set the operating point from the cost of a missed spam versus a quarantined ham, not from 0.5.",
        answer: [
          { t: "p", text: "Calibration diagnosed and fixed; then four concrete causes of the misses with their remedies; then the metric and threshold critique." }
        ]
      }
    ]
  }
});

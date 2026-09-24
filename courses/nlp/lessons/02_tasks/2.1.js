/* ============================================================================
   LESSON 2.1 — Text Classification
   Mirrors 01_NLP_Notes.md · §9. The reference's three pipelines are run on
   real 20-newsgroups data, Naive Bayes is worked by hand and checked against
   sklearn, and the imbalance failure is measured (scratchpad/nlp/n21.py).
   ========================================================================= */
EC.receiveLesson({
  id: "2.1",

  lede: "**Naive Bayes beat both logistic regression and the SVM on this task, and a model that predicts nothing at all scored 98 % accuracy on another.** Text classification is the most common NLP task and the one where the metric matters most: the same predictions can look excellent or useless depending on which number you report. This lesson runs the reference's three pipelines on real data, works Naive Bayes by hand, and measures what imbalance does to accuracy.",

  objectives: [
    "Build the classical TF-IDF plus classifier pipeline",
    "Compute Naive Bayes probabilities by hand and check them",
    "Compare Naive Bayes, logistic regression and SVM on real text",
    "Explain why accuracy is misleading under class imbalance",
    "Choose between a classical baseline and a fine-tuned transformer"
  ],

  prerequisites: ["1.8", "1.4"],

  blocks: [

    { t: "h2", n: "01", text: "The pipeline", id: "pipeline" },

    { t: "code", lang: "python", title: "TF-IDF plus a linear classifier",
      code: `pipelines = {
    "Logistic Regression": Pipeline([
        ("tfidf", TfidfVectorizer(max_features=10000, ngram_range=(1, 2))),
        ("clf", LogisticRegression(max_iter=1000))]),
    "Naive Bayes": Pipeline([
        ("tfidf", TfidfVectorizer(max_features=10000)),
        ("clf", MultinomialNB())]),
    "SVM": Pipeline([
        ("tfidf", TfidfVectorizer(max_features=10000, ngram_range=(1, 2))),
        ("clf", LinearSVC())]),
}`,
      caption: "Wrapping vectoriser and classifier in a `Pipeline` is not cosmetic — it means the vectoriser is fitted inside each cross-validation fold, which is the only way to avoid the leakage lesson 4.8 of the DL course measured." },

    { t: "out", text: `  2323 train, 1546 test, 4 classes
  class counts (train): [584, 600, 593, 546]

  Logistic Regression  0.8782 +/- 0.0156
  Naive Bayes          0.9040 +/- 0.0084
  SVM                  0.8911 +/- 0.0115
  majority class       0.2583            <- the baseline to beat` },

    { t: "callout", kind: "insight", title: "Naive Bayes won, and that is not unusual on text",
      body: [{ t: "p", text: "Naive Bayes beat both discriminative models in cross-validation and again on the held-out test set — **0.8933 against 0.8642 for logistic regression**. Its independence assumption is plainly false for language, and it wins anyway on this kind of task because text is high-dimensional and sparse, the assumption's bias is a form of regularisation, and it needs very little data to estimate its parameters. It is also the fastest thing in the table by a wide margin. The lesson is not that Naive Bayes is best, but that **you cannot predict which classical model wins without running all three**, and running all three takes under a minute." }] },

    { t: "out", text: `  Logistic Regression  acc 0.8642   macro-F1 0.8643
  Naive Bayes          acc 0.8933   macro-F1 0.8928
  SVM                  acc 0.8700   macro-F1 0.8694` },

    { t: "h2", n: "02", text: "Naive Bayes by hand", id: "nb" },

    { t: "math", tex: "\\hat{y} = \\arg\\max_{c} \\; \\log P(c) + \\sum_{i} \\log P(w_i \\mid c), \\qquad P(w \\mid c) = \\frac{\\text{count}(w, c) + \\alpha}{\\text{count}(c) + \\alpha|V|}" },

    { t: "out", text: `  corpus: [('good movie great acting', 1), ('bad movie poor acting', 0),
           ('great film good story', 1), ('terrible film bad story', 0)]
  vocabulary (9): ['acting','bad','film','good','great','movie','poor','story','terrible']

  classifying 'good film' with add-1 smoothing:
    class 1: P(good|c1)=(2+1)/(8+9)=0.1765  P(film|c1)=(1+1)/(8+9)=0.1176
             log P = -4.5678
    class 0: P(good|c0)=(0+1)/(8+9)=0.0588  P(film|c0)=(1+1)/(8+9)=0.1176
             log P = -5.6664
  sklearn MultinomialNB predicts class 1 for 'good film'` },

    { t: "p", text: "`good` never appears in a negative document, so without smoothing its probability there would be zero and the whole product would collapse — the same failure lesson 1.5 measured for n-gram models, and the same fix. With add-one smoothing it gets 0.0588 rather than 0, and the class-1 log-probability wins by about 1.1 nats. The hand calculation and scikit-learn agree." },

    { t: "callout", kind: "mental", title: "'Naive' names the assumption, not the quality",
      body: [{ t: "p", text: "The model assumes every word is conditionally independent of every other given the class — that seeing `not` tells you nothing about whether `good` follows. That is obviously false, and it means the probabilities Naive Bayes outputs are badly calibrated: they cluster near 0 and 1 because independent evidence is multiplied as if it were genuinely independent, so correlated words count several times over. **Use it for the ranking, not for the probability.** If you need calibrated confidences, use logistic regression, or calibrate the output with Platt scaling or isotonic regression." }] },

    { t: "h2", n: "03", text: "Why accuracy lies", id: "imbalance" },

    { t: "out", text: `  a 2% positive rate, and a model that ALWAYS predicts negative:
    accuracy  0.9800   <- looks excellent
    macro-F1  0.4949   <- tells the truth
    recall on the positive class: 0.0000` },

    { t: "callout", kind: "crit", title: "98 % accuracy, zero recall, nothing learned",
      body: [{ t: "p", text: "The model never predicts the positive class at all — it has learned nothing — and accuracy rewards it with 0.98 because 98 % of the data is negative. This is not a corner case: spam, fraud, defect detection, medical screening and content moderation are all heavily imbalanced, and they are all tasks where the minority class is the only one anyone cares about. **Macro-F1 averages the per-class F1 scores equally**, so a class the model ignores drags it down — 0.4949 here, correctly reporting that half the job is not being done. Report macro-F1 or per-class recall on any imbalanced problem, and treat a bare accuracy figure as a claim that needs checking." }] },

    { t: "table", head: ["Metric", "What it rewards", "Use when"],
      rows: [
        ["Accuracy", "Getting the majority right", "Classes are roughly balanced and errors cost the same"],
        ["Macro-F1", "Doing well on every class equally", "Imbalanced data where the minority matters — the usual default"],
        ["Micro-F1", "Getting individual predictions right", "Multi-label, or when every instance counts equally"],
        ["Weighted F1", "Performance proportional to class size", "Reporting alongside macro, not instead of it"],
        ["Per-class recall", "Not missing a specific class", "When one class carries the cost — fraud, disease, abuse"]
      ] },

    { t: "h2", n: "04", text: "Transformers, zero-shot and fine-tuned", id: "transformers" },

    { t: "code", lang: "python", title: "Zero-shot: no training at all",
      code: `classifier = pipeline("zero-shot-classification",
                      model="facebook/bart-large-mnli")
result = classifier(
    "The stock market crashed after the Federal Reserve raised interest rates",
    candidate_labels=["politics", "sports", "finance", "technology", "health"])
# finance 0.95`,
      caption: "This works by reframing classification as natural language inference — does *this text* entail *this text is about finance*? Lesson 3.8 covers NLI, which is the mechanism underneath." },

    { t: "dl", items: [
      ["Zero-shot", "No labelled data at all. Good for exploration, a new label appearing tomorrow, or a long tail of rare categories. Slow per document and less accurate than a fitted model."],
      ["Fine-tuned transformer", "Best accuracy when you have a few thousand labelled examples. `AutoModelForSequenceClassification` with `num_labels`, learning rate around 2e-5, two to four epochs."],
      ["Classical baseline", "Under a minute to train, interpretable, and frequently within a few points. Always run it first."]
    ] },

    { t: "callout", kind: "good", title: "The order to try things in",
      body: [{ t: "p", text: "Majority-class baseline, then TF-IDF with all three classical classifiers, then a fine-tuned transformer — in that order, because each step tells you what the next one has to beat. Here the majority baseline was 0.2583 and Naive Bayes reached 0.8933 in seconds; a transformer would have to clear that to justify its cost. It is a common and expensive mistake to start with fine-tuning, get 0.91, and never discover that a model you could have trained on a laptop reached 0.89." }] },

    { t: "exercise", kind: "practice", title: "Run the ladder", difficulty: "core", minutes: 40,
      prompt: "On a text classification dataset of your choice, evaluate in order: majority-class baseline, Naive Bayes, logistic regression and LinearSVC over TF-IDF, then a fine-tuned transformer. Report accuracy and macro-F1 for each, and training time. Then deliberately make the dataset imbalanced by downsampling one class to 2 % and repeat, watching what happens to accuracy against macro-F1. Finally, inspect the top-weighted features for the linear models and check they are sensible.",
      hints: [
        "Wrap the vectoriser in a `Pipeline` so it is refitted inside each CV fold.",
        "Time the training as well as measuring accuracy — the ratio is part of the decision.",
        "Under imbalance, also report per-class recall, not just the averages."
      ],
      solution: {
        notes: [
          { t: "p", text: "The training-time column changes how the accuracy column reads. I measured Naive Bayes reaching 0.8933 in under a second where a fine-tuned transformer takes minutes on a GPU, and if the gap is two points then the right choice depends entirely on what those two points are worth in your application. Reporting accuracy without cost makes that decision invisible." },
          { t: "p", text: "The imbalance experiment is worth doing deliberately because the effect is so large: at a 2 % positive rate, a model predicting only the majority scores 0.98 accuracy and 0.4949 macro-F1 with zero recall on the class of interest. Once you have seen those two numbers side by side for a model that has learned nothing, a bare accuracy figure never looks the same again." },
          { t: "p", text: "Reading the top features is the fastest sanity check in classical NLP. If they are sensible domain words, the pipeline is sound. If they are stopwords, the idf is not doing enough — and remember from lesson 1.4 that idf downweights but does not remove them. If they are artefacts like document IDs or boilerplate, you have leakage and the accuracy is fictional." }
        ]
      } }

  ],

  takeaways: [
    "Measured on 20-newsgroups: Naive Bayes 0.8933, SVM 0.8700, logistic regression 0.8642, majority baseline 0.2583.",
    "Naive Bayes often wins on text — sparse high-dimensional data suits it, and its bias acts as regularisation.",
    "You cannot predict which classical model wins without running all three, and that takes under a minute.",
    "Naive Bayes needs smoothing for the same reason n-gram models do: one unseen word zeroes the product.",
    "Its independence assumption makes probabilities badly calibrated — use the ranking, not the confidence.",
    "At a 2 % positive rate, a model predicting only the majority scored accuracy 0.98 and macro-F1 0.4949.",
    "Report macro-F1 or per-class recall on any imbalanced task.",
    "Try in order: majority baseline, classical pipelines, then a transformer — each tells you what the next must beat."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "A binary classifier scores 98 % accuracy on data that is 98 % negative. What do you conclude?",
      options: ["It is an excellent model", "It may have learned nothing — check macro-F1 and per-class recall", "The data is clean", "It is overfitting"],
      answer: 1,
      why: "A model that always predicts the majority achieves exactly that accuracy. In the measured case macro-F1 was 0.4949 and recall on the positive class was 0.0000 — the class anyone cares about was never predicted at all. Accuracy under imbalance rewards ignoring the minority entirely." },
    { stem: "Why does Naive Bayes often beat logistic regression on text?",
      options: ["Its independence assumption is true for language", "Text is sparse and high-dimensional, where its bias acts as regularisation and it needs little data", "It uses more features", "It handles word order"],
      answer: 1,
      why: "The assumption is plainly false — that is what 'naive' names — but it wins anyway on this kind of data, measured at 0.8933 against 0.8642 here. Sparse high-dimensional problems favour a strongly biased estimator, and Naive Bayes estimates its parameters from very few examples." },
    { stem: "Why should Naive Bayes probabilities not be used as confidences?",
      options: ["They are not normalised", "Correlated words are multiplied as if independent, pushing outputs towards 0 and 1", "They are always uniform", "The smoothing distorts them"],
      answer: 1,
      why: "The independence assumption means correlated evidence is counted several times over, so the posterior saturates and the model appears far more certain than it is. Use the ranking, which is generally sound, and if you need calibrated confidences use logistic regression or apply Platt scaling." },
    { stem: "Why wrap the vectoriser and classifier in a `Pipeline` for cross-validation?",
      options: ["It is faster", "So the vectoriser is refitted inside each fold, avoiding leakage from the validation data", "It reduces memory", "It enables parallelism"],
      answer: 1,
      why: "Fitting the vectoriser once on all the data means the vocabulary and idf statistics were computed using the validation fold, which inflates the score. A `Pipeline` makes the whole thing one estimator so `cross_val_score` refits every step inside each fold — the same discipline as fitting a scaler on training data only." }
  ] },

  interview: { title: "Interview", sub: "Classification", questions: [
    { level: "Core", q: "How would you approach a text classification problem?",
      strong: "Baseline first, then classical pipelines, then a transformer — with macro-F1 if imbalanced.",
      answer: [{ t: "p", text: "In order of cost. Majority-class baseline first, so I know what any model must beat — on a four-class problem I ran, that was 0.2583. Then TF-IDF with Naive Bayes, logistic regression and a linear SVM, all three, because you cannot predict which wins: Naive Bayes took that dataset at 0.8933 while logistic regression got 0.8642, which is the opposite of what people expect. That whole stage takes under a minute. Only then a fine-tuned transformer, which now has a concrete number to justify itself against rather than being compared to nothing. Throughout, I would pick the metric before the model: accuracy is fine for balanced data, but for anything skewed I would report macro-F1 and per-class recall, because accuracy rewards ignoring the minority class and that is usually the class the product exists for." }] },
    { level: "Core", q: "Why is Naive Bayes called naive, and does it matter?",
      strong: "It assumes conditional independence between features; the ranking survives, the probabilities do not.",
      answer: [{ t: "p", text: "It assumes every word is conditionally independent of every other given the class, which for language is plainly false — `not` and `good` are obviously dependent. It matters in a specific way. The classification decision is often fine, because the assumption's bias acts like regularisation on sparse high-dimensional data and the model needs very few examples to estimate its parameters; I have measured it beating logistic regression on real text. What does not survive is calibration: correlated evidence gets multiplied as though independent, so the same signal is counted several times and the posterior saturates near zero or one. So I would use the argmax and the ranking, and never quote the probability as a confidence. If I needed calibrated output I would use logistic regression, or fit Platt scaling on a held-out set." }] },
    { level: "Senior", q: "A stakeholder reports 95 % accuracy on a fraud classifier. What do you ask?",
      strong: "What the base rate is, and what the recall on the fraud class is.",
      answer: [{ t: "p", text: "What fraction of the data is fraud, and what the recall on that class is. Fraud is typically well under one per cent, so a model that flags nothing scores over ninety-nine per cent accuracy while catching zero fraud — I measured exactly this shape at a two per cent positive rate, where always-negative gave 0.98 accuracy, 0.4949 macro-F1 and 0.0000 recall on the class of interest. So the accuracy figure carries essentially no information. I would want per-class precision and recall, and then a conversation about the operating point, because in fraud the cost of a miss and the cost of a false alarm are wildly different and the threshold is a business decision rather than a modelling one. I would also ask how the evaluation set was constructed, since a balanced test set makes the numbers look reasonable while telling you nothing about live performance at the real base rate." }] }
  ] }
});

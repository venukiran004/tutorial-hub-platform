/* ============================================================================
   LESSON 2.1 — The Confusion Matrix and Everything Built on It
   ========================================================================= */
EC.receiveLesson({
  id: "2.1",

  lede: "**Four numbers — true positives, false positives, false negatives, true negatives — and every classification metric you will ever report is a ratio of some of them.** Which ratio you choose is the decision about which mistake you can afford. This lesson takes one model on the churn table's held-out 297 customers, writes down its four numbers at one threshold, and computes fourteen metrics from them by hand: precision and recall, specificity and NPV, F1 and its weighted cousins, balanced accuracy, Cohen's kappa and the Matthews coefficient. Then it shows what each does when the class is 16 % of the data, why a constant predictor scores 0.838 accuracy and 0.000 kappa, and how three ways of averaging a multi-class result give three different numbers.",

  objectives: [
    "Read a confusion matrix and compute accuracy, precision, recall, specificity, NPV, FPR, FNR, FDR and prevalence from it",
    "Compute F1, F-beta, G-mean and balanced accuracy, and say why F1 is a harmonic mean",
    "Compute Cohen's kappa and the Matthews correlation coefficient, and explain what they correct for that accuracy does not",
    "Average precision, recall and F1 across classes by micro, macro and weighted rules, and know which to report when"
  ],

  prerequisites: ["1.2"],

  blocks: [

    { t: "h2", n: "01", text: "The four numbers", id: "matrix" },

    { t: "p", text: "A balanced-class-weight logistic regression on the churn table, scored on the 297 held-out customers of whom 48 churned, thresholded at 0.5. **The mnemonic: the second word is what the model said; the first word is whether it was right.** A false positive is a customer the model called a churner who stayed; a false negative is a churner the model missed." },

    { t: "table",
      head: ["", "Predicted churn", "Predicted stay", "Row total"],
      rows: [
        ["**Actually churned**", "TP = 39", "FN = 9", "48 (prevalence 0.162)"],
        ["**Actually stayed**", "FP = 89", "TN = 160", "249"],
        ["**Column total**", "128 flagged", "169 cleared", "297"]
      ]
    },

    { t: "code", lang: "text", title: "Fourteen metrics from four numbers (executed and checked against scikit-learn)",
      code: `TP = 39   FP = 89   FN = 9   TN = 160   n = 297

accuracy          (TP + TN) / n              = 199 / 297  = 0.670        of everyone, how many did I get right
precision  (PPV)   TP / (TP + FP)             =  39 / 128  = 0.305        of those I flagged, how many churned         "can I trust a yes?"
recall     (TPR)   TP / (TP + FN)             =  39 /  48  = 0.812        of the churners, how many did I catch        "did I find them?"
specificity (TNR)  TN / (TN + FP)             = 160 / 249  = 0.643        of the stayers, how many did I clear
NPV                TN / (TN + FN)             = 160 / 169  = 0.947        of those I cleared, how many stayed          "can I trust a no?"
FPR                FP / (FP + TN)             =  89 / 249  = 0.357        = 1 - specificity     the ROC x-axis
FNR                FN / (FN + TP)             =   9 /  48  = 0.188        = 1 - recall          the miss rate
FDR                FP / (FP + TP)             =  89 / 128  = 0.695        = 1 - precision       the false-alarm share
prevalence         (TP + FN) / n              =  48 / 297  = 0.162        the base rate

balanced accuracy  (recall + specificity) / 2 = (0.812 + 0.643) / 2      = 0.728
G-mean             sqrt(recall x specificity) = sqrt(0.812 x 0.643)      = 0.723
F1                 2PR / (P + R)              = 2(0.305)(0.812) / 1.117  = 0.443
F2                 5PR / (4P + R)             = 5(0.248) / (1.220+0.812) = 0.609        recall weighted 2x
F0.5               1.25PR / (0.25P + R)       = 1.25(0.248) / (0.076+0.812) = 0.348     precision weighted 2x

kappa              (p_o - p_e) / (1 - p_e)    p_o = 0.670;  p_e = (128·48 + 169·249) / 297² = 0.547;   (0.670 - 0.547) / 0.453 = 0.272
MCC                (TP·TN - FP·FN) / sqrt((TP+FP)(TP+FN)(TN+FP)(TN+FN)) = (6240 - 801) / sqrt(128·48·249·169) = 0.338`,
      caption: "Every one of these is the same 297 predictions read from a different angle. Precision is read down the flagged column; recall across the churned row. The two 'trust' metrics — precision for a yes, NPV for a no — are the ones a person acting on a prediction cares about, and they depend on prevalence: at a 1 % base rate the same recall and specificity would give a precision near 0.03."
    },

    { t: "dl", items: [
      ["Precision (PPV)", "TP / (TP + FP). The reliability of a positive call. Falls as the threshold falls, and as prevalence falls."],
      ["Recall (sensitivity, TPR)", "TP / (TP + FN). The share of real positives found. Rises as the threshold falls. Independent of prevalence."],
      ["Specificity (TNR)", "TN / (TN + FP). The share of real negatives cleared. The other axis of the ROC curve, as 1 − specificity."],
      ["NPV", "TN / (TN + FN). The reliability of a negative call. High when positives are rare, whatever the model does — here 0.947."],
      ["F1", "The harmonic mean of precision and recall. Punishes imbalance between them: P = 0.9, R = 0.1 gives 0.18, not the arithmetic 0.50."],
      ["F-beta", "Weights recall β times as much as precision: F2 for screening, F0.5 for auto-decline. Same harmonic form with weights."],
      ["Balanced accuracy", "The mean of recall and specificity. 0.5 for any constant predictor, whatever the base rate."],
      ["Cohen's kappa", "Agreement between prediction and truth beyond what their marginals would produce by chance: (p_o − p_e) / (1 − p_e). 0 for any constant predictor."],
      ["Matthews correlation coefficient", "The correlation between predicted and actual labels, using all four cells symmetrically. −1 to 1; 0 for chance; the single most honest one-number summary for imbalanced binary problems."]
    ]},

    { t: "h2", n: "02", text: "What the base rate does", id: "baserate" },

    { t: "code", lang: "text", title: "Two constant predictors and the model, side by side (executed)",
      code: `                    accuracy   balanced acc   F1      kappa    MCC
always 'stay'         0.838       0.500       0.000    0.000    0.000      <- beats the model on accuracy by seventeen points
always 'churn'        0.162       0.500       0.278    0.000    0.000      <- F1 of 0.278 for flagging everyone
the model @ 0.5       0.670       0.728       0.443    0.272    0.338

# the metrics that see through the base rate are the ones that are 0 (or 0.5) for a constant predictor:
# balanced accuracy, kappa, MCC. Accuracy and F1 are not; their 'no skill' values depend on prevalence.`,
      caption: "Accuracy rewards the model that never flags anyone, because 84 % of customers stay. F1 is not immune either: the predictor that flags everyone scores 0.278 without knowing anything. Kappa and MCC subtract the agreement that the marginals alone would produce, which is why both read zero for a constant predictor at any base rate — and why MCC is the better single number to put on a dashboard for a rare class."
    },

    { t: "code", lang: "text", title: "Why F1 is a harmonic mean",
      code: `precision 0.9, recall 0.1:     arithmetic mean  (0.9 + 0.1) / 2  = 0.50        <- says 'half good'
                               harmonic mean    2(0.9)(0.1)/1.0  = 0.18        <- says 'nearly useless', which it is

the harmonic mean of two numbers is dominated by the smaller one; F1 is high only when both are.
a model that flags one customer, correctly, has precision 1.0 and recall 0.02: F1 = 0.04.`,
      caption: "Use F1 when both kinds of error matter and you have no cost model; use F-beta when they matter unequally; and use neither when the base rate is extreme and the operating point is fixed by a budget — then report precision and recall at that point, or the cost (2.3)."
    },

    { t: "viz",
      title: "The threshold moves the four numbers, and every metric with them",
      caption: "Lowering the threshold from 0.5 to 0.35 moved three churners from FN to TP and 54 stayers from TN to FP. Recall rose, precision fell, accuracy fell below 0.5, kappa halved. There is no free move on this square; every metric is a different opinion about which cells matter.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="Two two-by-two confusion matrices side by side, at threshold 0.5 and 0.35, with arrows showing counts moving from false negative to true positive and from true negative to false positive, and the resulting recall, precision and kappa beneath each.">
  <g class="s-label" text-anchor="middle" style="font-weight:600">
    <text x="200" y="28">threshold 0.50</text>
    <text x="680" y="28">threshold 0.35</text>
  </g>
  <g stroke-width="1.2">
    <rect x="110" y="45" width="90" height="60" rx="6" style="fill:var(--good);fill-opacity:.15;stroke:var(--good)"/>
    <rect x="200" y="45" width="90" height="60" rx="6" style="fill:var(--crit);fill-opacity:.10;stroke:var(--crit)"/>
    <rect x="110" y="105" width="90" height="60" rx="6" style="fill:var(--warn);fill-opacity:.12;stroke:var(--warn)"/>
    <rect x="200" y="105" width="90" height="60" rx="6" style="fill:var(--good);fill-opacity:.15;stroke:var(--good)"/>
    <rect x="590" y="45" width="90" height="60" rx="6" style="fill:var(--good);fill-opacity:.15;stroke:var(--good)"/>
    <rect x="680" y="45" width="90" height="60" rx="6" style="fill:var(--crit);fill-opacity:.10;stroke:var(--crit)"/>
    <rect x="590" y="105" width="90" height="60" rx="6" style="fill:var(--warn);fill-opacity:.12;stroke:var(--warn)"/>
    <rect x="680" y="105" width="90" height="60" rx="6" style="fill:var(--good);fill-opacity:.15;stroke:var(--good)"/>
  </g>
  <g class="s-mono" text-anchor="middle">
    <text x="155" y="70">TP</text><text x="155" y="90">39</text><text x="245" y="70">FN</text><text x="245" y="90">9</text>
    <text x="155" y="130">FP</text><text x="155" y="150">89</text><text x="245" y="130">TN</text><text x="245" y="150">160</text>
    <text x="635" y="70">TP</text><text x="635" y="90">42</text><text x="725" y="70">FN</text><text x="725" y="90">6</text>
    <text x="635" y="130">FP</text><text x="635" y="150">143</text><text x="725" y="130">TN</text><text x="725" y="150">106</text>
  </g>
  <g class="s-sub" text-anchor="middle">
    <text x="60" y="80">churned</text><text x="60" y="140">stayed</text>
    <text x="155" y="182">flagged</text><text x="245" y="182">cleared</text>
    <text x="540" y="80">churned</text><text x="540" y="140">stayed</text>
    <text x="635" y="182">flagged</text><text x="725" y="182">cleared</text>
  </g>
  <g class="s-sub" text-anchor="middle">
    <text x="440" y="80" style="fill:var(--good)">3 churners: FN → TP</text>
    <text x="440" y="140" style="fill:var(--crit)">54 stayers: TN → FP</text>
    <text x="440" y="110">lower the threshold →</text>
  </g>
  <g class="s-sub" text-anchor="middle">
    <text x="200" y="215">recall 0.812 · precision 0.305 · accuracy 0.670 · kappa 0.272</text>
    <text x="680" y="215">recall 0.875 · precision 0.227 · accuracy 0.498 · kappa 0.140</text>
  </g>
</svg>`
    },

    { t: "h2", n: "03", text: "Three classes, three averages", id: "multiclass" },

    { t: "p", text: "Predicting the subscription plan (basic, plus, pro) from tenure, fee and logins gives a 3×3 confusion matrix, and precision, recall and F1 exist per class. To report one number, the per-class values must be averaged, and **the three averaging rules answer three different questions.**" },

    { t: "table",
      head: ["actual \\ predicted", "basic", "plus", "pro", "support"],
      rows: [
        ["**basic**", "119", "30", "0", "149"],
        ["**plus**", "32", "66", "7", "105"],
        ["**pro**", "2", "19", "22", "43"]
      ]
    },

    { t: "code", lang: "text", title: "Per-class metrics and the three averages (executed)",
      code: `per class        precision   recall   F1      support
  basic            0.778      0.799   0.788    149
  plus             0.574      0.629   0.600    105
  pro              0.759      0.512   0.611     43        <- the small class: half its members are called 'plus'

micro    precision 0.697  recall 0.697  F1 0.697      pool all cells first: TP/(TP+FP) over the whole matrix. Equals accuracy for single-label problems.
macro    precision 0.703  recall 0.646  F1 0.666      average the three per-class values with equal weight: 'pro' counts as much as 'basic'
weighted precision 0.703  recall 0.697  F1 0.696      average weighted by support: 'pro' counts 43/297

top-2 accuracy 0.966 (the true plan is among the two highest probabilities)   top-1 0.697`,
      caption: "Macro recall is 0.646 and micro recall 0.697: the gap is the small class being handled badly, which the micro average hides because 'pro' contributes only 43 of 297 rows. **Report macro when every class matters equally — rare diagnoses, minority segments; micro or accuracy when every row matters equally; weighted when you want a support-adjusted summary and know it hides the small classes.** Top-k accuracy is for recommendation-style outputs where showing the right answer second is nearly as good as first."
    },

    { t: "table",
      head: ["Average", "Computed as", "Weights", "Report when", "Hides"],
      rows: [
        ["Micro", "Sum TP, FP, FN over classes, then the ratio", "Each row equally", "Rows are what matter; classes are roughly balanced", "A small class doing badly"],
        ["Macro", "Mean of per-class metrics", "Each class equally", "Every class matters, including rare ones", "That the rare class has few rows and a noisy metric"],
        ["Weighted", "Per-class metrics weighted by support", "Each class by its size", "A summary adjusted for imbalance that still tracks accuracy", "The same small-class problems as micro, slightly less"],
        ["Per class", "No averaging", "—", "Always, alongside whichever average you pick", "Nothing — and it is a table, not a number"]
      ]
    },

    { t: "callout", kind: "mental", title: "The question behind the metric", body: [
      { t: "p", text: "Every metric is a sentence that starts 'of all the …'. Precision: of all the ones I flagged. Recall: of all the real ones. Specificity: of all the real negatives. NPV: of all the ones I cleared. **When someone asks for 'the accuracy', ask which sentence they mean** — the retention team means recall among the people they can call, the fraud team means precision among declined cards, and the compliance team means specificity among honest customers. The confusion matrix has a number for each; 'accuracy' has one for none of them." }
    ]},

    { t: "ladder",
      title: "Reporting a 16 %-prevalence classifier to a stakeholder",
      rungs: [
        { level: "bad", label: "'Accuracy is 84 %'", code: `accuracy_score(y_test, model.predict(X_test))        # 0.838 for a model that never flags anyone`,
          note: "**Indistinguishable from doing nothing.** The stakeholder cannot tell whether the model works." },
        { level: "ok", label: "'F1 is 0.44, MCC 0.34'", code: `f1_score(...), matthews_corrcoef(...)`,
          note: "**Honest, and opaque.** Neither number tells the retention team how many calls they will make or how many churners they will reach." },
        { level: "best", label: "The matrix at the operating point, in their units", code: `# at threshold 0.5: we flag 128 customers a month; 39 of them will churn (precision 0.31); that is 39 of the 48 churners (recall 0.81);
# the 9 we miss and the 89 calls that were not needed are the two costs, and the threshold trades one for the other (2.3)`,
          note: "**Four numbers in the stakeholder's units, plus the trade-off.** MCC can go in a footnote." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Compute",
      title: "A matrix by hand, and a matrix that lies",
      difficulty: "core",
      minutes: 22,
      body: [
        { t: "p", text: "**(a)** A fraud model on 10,000 transactions with 100 frauds flags 250 transactions, 60 of them fraud. Write the confusion matrix and compute accuracy, precision, recall, specificity, NPV, F1, F2, balanced accuracy, kappa and MCC by hand. **(b)** A second model flags nobody. Compute the same ten metrics. **(c)** A third model flags everyone. Same again. **(d)** For a hospital screening test, say which metric each of these people cares about and why: the patient told 'negative'; the patient told 'positive'; the radiologist deciding whom to recall; the hospital budget holder." }
      ],
      requirements: [
        "All ten metrics for (a), with the arithmetic visible.",
        "The three models compared on kappa and MCC in one sentence.",
        "Four one-line answers for (d), each naming a metric from this lesson."
      ],
      hint: "For (a): TP 60, FP 190, FN 40, TN 9,710. p_e for kappa uses the marginals: (250·100 + 9,750·9,900) / 10,000².",
      solution: {
        lang: "text",
        title: "Worked",
        code: `(a)  TP 60   FP 190   FN 40   TN 9,710       n = 10,000, prevalence 0.010
accuracy      (60 + 9,710) / 10,000              = 0.977
precision     60 / 250                           = 0.240
recall        60 / 100                           = 0.600
specificity   9,710 / 9,900                      = 0.981
NPV           9,710 / 9,750                      = 0.996
F1            2(0.24)(0.60) / 0.84               = 0.343
F2            5(0.144) / (0.96 + 0.60)           = 0.462
balanced acc  (0.600 + 0.981) / 2                = 0.790
kappa         p_o = 0.977;  p_e = (250·100 + 9,750·9,900) / 10⁸ = (25,000 + 96,525,000) / 10⁸ = 0.9655;  (0.977 - 0.9655) / 0.0345 = 0.333
MCC           (60·9,710 - 190·40) / sqrt(250·100·9,900·9,750) = (582,600 - 7,600) / sqrt(2.413e12) = 575,000 / 1,553,400 = 0.370

(b)  flags nobody: TP 0  FP 0  FN 100  TN 9,900
accuracy 0.990   precision undefined (0/0; sklearn reports 0)   recall 0   specificity 1.0   NPV 0.990   F1 0   F2 0   balanced acc 0.500   kappa 0   MCC 0

(c)  flags everyone: TP 100  FP 9,900  FN 0  TN 0
accuracy 0.010   precision 0.010   recall 1.0   specificity 0   NPV undefined   F1 0.020   F2 0.048   balanced acc 0.500   kappa 0   MCC 0

Model (b) has the highest accuracy of the three (0.990) and, like (c), zero kappa and zero MCC: both are constant predictors,
and only (a) shows skill -- kappa 0.333, MCC 0.370 -- despite the lowest accuracy of the two 'safe' options.

(d)  patient told 'negative': NPV -- of those told negative, how many truly are (0.996 here; reassurance is warranted)
     patient told 'positive': precision / PPV -- of those told positive, how many truly are (0.240: three in four are false alarms, so a follow-up test, not a diagnosis)
     radiologist deciding whom to recall: recall / sensitivity and the FNR -- how many real cases the protocol misses
     budget holder: FPR and the raw FP count -- 190 unnecessary follow-ups per 10,000; specificity is the metric, cost is the unit`,
        notes: [
          { t: "p", text: "**Accuracy ranked the useless model first.** This is not a pathology of the example; it is what accuracy measures at a 1 % base rate." },
          { t: "p", text: "**Kappa and MCC agreed on the ranking and on the zero for both constant predictors** — the property that makes them safe single numbers for a rare class." },
          { t: "p", text: "**Four people, four metrics, one matrix.** The reason to keep the four cells visible is that everyone downstream reads a different ratio of them." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "NPV was 0.947 for the churn model and 0.990 for a fraud model that flags nobody. What does a high NPV tell you?",
          options: [
            "The model is reliable",
            "Mostly the base rate: when positives are rare, almost everyone cleared is a true negative whatever the model does — NPV must be read against 1 − prevalence, just as precision must be read against prevalence",
            "The model has high recall",
            "The threshold is well chosen"
          ],
          answer: 1,
          why: "1 − prevalence was 0.838 and 0.990 respectively. NPV above that shows skill; NPV equal to it is a constant predictor."
        }
      ]
    }
  ],

  takeaways: [
    "**Four cells, fourteen ratios**: precision down the flagged column, recall across the positive row, specificity across the negative row, NPV down the cleared column.",
    "**Each metric is a sentence beginning 'of all the …'**; ask which sentence the stakeholder means.",
    "**Accuracy at 16 % prevalence rewards never flagging** (0.838); at 1 % it rewards it more.",
    "**F1 is a harmonic mean**: dominated by the smaller of precision and recall (0.9, 0.1 → 0.18).",
    "**F-beta weights recall β² times precision**: F2 for screening, F0.5 for auto-decline.",
    "**Balanced accuracy, kappa and MCC read 0.5 / 0 / 0 for any constant predictor** — the base-rate-proof metrics; MCC is the honest single number for a rare class.",
    "**Precision and NPV depend on prevalence; recall and specificity do not** — the same model at a lower base rate has lower precision.",
    "**Micro pools cells (equals accuracy); macro averages classes equally; weighted averages by support** — macro exposes a badly handled small class.",
    "**Always show the per-class table next to whichever average you pick.**",
    "**Report the matrix at the operating point in the stakeholder's units**; the summary metric is a footnote."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Precision fell from 0.305 to 0.227 and recall rose from 0.812 to 0.875 when the threshold dropped from 0.5 to 0.35. Why do they move in opposite directions?",
        options: [
          "A bug in the threshold",
          "Lowering the threshold flags more customers: some of the new flags are churners (TP up, FN down — recall rises) but more are stayers (FP up much more — precision falls); the two metrics count the same new flags from different rows of the matrix",
          "Recall and precision are independent",
          "The model was retrained"
        ],
        answer: 1,
        why: "3 rows moved FN → TP and 54 moved TN → FP. Every threshold is a point on this trade; the curve of all of them is 2.2 and the choice among them is 2.3."
      },
      {
        stem: "Why does Cohen's kappa read 0 for a model that flags everyone?",
        options: [
          "Because its accuracy is 0",
          "Because kappa subtracts the agreement expected from the marginals alone: a predictor that says 'churn' to everyone agrees with the truth exactly as often as chance given its marginals, so p_o = p_e",
          "Because it has no true negatives",
          "Kappa is undefined there"
        ],
        answer: 1,
        why: "Chance-corrected agreement is what kappa and MCC add over accuracy and F1 — and F1 gave the same predictor 0.278."
      },
      {
        stem: "Macro recall is 0.646 and micro recall 0.697 on the three-plan problem. What explains the gap?",
        options: [
          "Rounding",
          "The smallest class (pro, 43 rows) has recall 0.512; macro gives it a third of the weight, micro gives it 43/297 — so micro hides the badly handled class",
          "Micro recall is always higher",
          "The classes are balanced"
        ],
        answer: 1,
        why: "When macro is well below micro, look for a small class with a low per-class score. That is the diagnostic use of reporting both."
      },
      {
        stem: "A screening programme wants to weight missed cases four times as heavily as false alarms. Which metric?",
        options: [
          "F1",
          "F2 — F-beta with β = 2 weights recall β² = 4 times precision; or better, a cost-weighted threshold with the actual costs (2.3)",
          "Precision",
          "Specificity"
        ],
        answer: 1,
        why: "F-beta encodes a ratio of importance, not of cost. When the costs are known in money or harm, use them directly."
      },
      {
        stem: "Which pair of metrics is unaffected by the base rate?",
        options: [
          "Precision and NPV",
          "Recall and specificity — each is a rate within one true class, so changing how many positives exist does not change it; precision and NPV mix the classes and shift with prevalence",
          "Accuracy and F1",
          "Kappa and accuracy"
        ],
        answer: 1,
        why: "This is why ROC curves (recall against FPR = 1 − specificity) are prevalence-independent and precision–recall curves are not (2.2)."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Define precision, recall and F1 and explain when to use each.",
        strong: "From the confusion matrix: precision is TP over TP plus FP — of the cases I flagged, how many were real; recall is TP over TP plus FN — of the real cases, how many I flagged. They trade against each other through the threshold: flag more and recall rises while precision falls. F1 is their harmonic mean, which is dominated by the smaller one, so it is high only when both are; F-beta shifts the weight toward recall for β above one. Use precision when a false alarm is expensive and acted on — auto-declining a card; recall when a miss is expensive — screening for disease; F1 when both matter and no cost model exists; and when the costs are known, none of these — choose the threshold by expected cost and report the matrix at that operating point. And for a rare class, MCC or kappa as the single summary, because F1 gives 0.28 to a model that flags everyone.",
        answer: [
          { t: "p", text: "The definitions, the threshold trade, the harmonic-mean point, and knowing when to abandon F1 for costs." }
        ]
      },
      {
        level: "core",
        q: "Why is accuracy misleading for imbalanced data, and when can you still use it?",
        strong: "Accuracy is the fraction of all rows classified correctly, so when one class dominates, a constant predictor scores the base rate — 0.84 on a 16 % churn problem, 0.99 on a 1 % fraud problem — and a real model can score lower while being far more useful. It also treats a false positive and a false negative as the same mistake, which they almost never are. You can still use it when the classes are roughly balanced and the two errors cost about the same — a balanced sentiment task, say — and even then I would show the confusion matrix beside it. For imbalance I switch to balanced accuracy, MCC or kappa as a summary, and precision and recall at the operating point as the report.",
        answer: [
          { t: "p", text: "The constant-predictor argument with numbers, the equal-cost assumption, and the conditions under which it is fine." }
        ]
      },
      {
        level: "advanced",
        q: "How do you handle multi-class evaluation, and which average do you report?",
        strong: "Start with the full confusion matrix and the per-class precision, recall and F1, because any average hides something. Micro-averaging pools the cells before taking the ratio, so each row counts equally and it collapses to accuracy for single-label problems — fine when rows are what matter. Macro-averaging takes the mean of per-class scores, so each class counts equally — the right choice when rare classes matter as much as common ones, and the diagnostic one, because a macro score well below micro means a small class is being handled badly. Weighted averaging weights classes by support, which is a compromise that mostly tracks accuracy. For probabilistic outputs I add multi-class log-loss and one-vs-rest AUCs, and for recommendation-style tasks top-k accuracy. In practice I report macro F1 with the per-class table, and I say which classes drag it down and why.",
        answer: [
          { t: "p", text: "Three averages with what each weights and what each hides, plus the per-class table as non-negotiable." }
        ]
      }
    ]
  }
});

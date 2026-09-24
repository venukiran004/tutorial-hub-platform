/* ============================================================================
   INTERVIEW I2.1 — Deep Dive
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/02_Mathematics_and_Statistics/02_Descriptive_Stats_and_Probability.md + 03_Inference_and_Testing.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i2.1",
 "lede": "**11 questions** from Deep Dive: The Questions Asked Most. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
 "objectives": [
  "Answer each question as you would in the interview, then compare against the reference answer",
  "Lead with the definition and the formula, then the trade-off",
  "Follow up on your own answer with the question an interviewer would ask next",
  "Note which questions you could not answer and return to the lesson that covers them"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "h2",
   "n": "01",
   "text": "Deep Dive",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "1",
   "q": "What is the difference between population and sample statistics? Why does it matter?",
   "body": [
    {
     "t": "p",
     "text": "**A:** Population parameters (\\(\\mu\\), \\(\\sigma\\)) are fixed but unknown values describing the entire group. Sample statistics (\\(\\bar{x}\\), \\(s\\)) are computed from a subset and vary from sample to sample. This distinction matters because: (1) We use sample statistics to **estimate** population parameters, (2) the estimation has **uncertainty** quantified by confidence intervals, (3) we must use Bessel's correction (\\(n-1\\)) for unbiased variance estimation, and (4) inferential statistics (hypothesis tests, CIs) only make sense when we're drawing conclusions about a population from a sample."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "Explain Bayes' Theorem. Why is it fundamental to machine learning?",
   "body": [
    {
     "t": "p",
     "text": "**A:** Bayes' Theorem updates beliefs given evidence: \\(P(\\theta|D) \\propto P(D|\\theta) \\cdot P(\\theta)\\). In ML: the likelihood \\(P(D|\\theta)\\) is the data fit (loss function), the prior \\(P(\\theta)\\) becomes regularization, and the posterior \\(P(\\theta|D)\\) is what we optimize. MLE maximizes only the likelihood (no regularization), while MAP includes the prior (regularization). Specifically: Gaussian prior → L2/Ridge, Laplace prior → L1/Lasso. Bayesian approaches also naturally quantify uncertainty — a MAP or MLE gives a point estimate, but the full posterior gives a distribution over parameters."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "When should you use median vs mean?",
   "body": [
    {
     "t": "p",
     "text": "**A:** Use **mean** for symmetric distributions without outliers — it uses all data and is the MLE for Normal distributions. Use **median** for skewed distributions or when outliers are present — it's robust and minimizes MAE. In income data (right-skewed), median is more representative. In ML: L2 loss (MSE) → predicts the mean, L1 loss (MAE) → predicts the median. When both mean and median differ significantly, the distribution is likely skewed."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What is MLE and how does it connect to machine learning loss functions?",
   "body": [
    {
     "t": "p",
     "text": "**A:** MLE finds parameters maximizing \\(P(\\text{data}|\\theta)\\). Equivalently, it minimizes \\(-\\log P(\\text{data}|\\theta)\\) (negative log-likelihood). This directly gives us:"
    },
    {
     "t": "ul",
     "items": [
      "**Normal noise assumption** → minimize MSE (regression)",
      "**Bernoulli assumption** → minimize binary cross-entropy (classification)",
      "**Categorical assumption** → minimize categorical cross-entropy (multi-class)"
     ]
    },
    {
     "t": "p",
     "text": "So every time you train a model by minimizing MSE or cross-entropy, you're doing MLE. Adding regularization makes it MAP estimation: \\(-\\log P(\\text{data}|\\theta) - \\log P(\\theta) = \\text{loss} + \\text{regularization}\\)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What distribution would you use for modeling count data?",
   "body": [
    {
     "t": "p",
     "text": "**A:** Start with **Poisson** (\\(\\lambda\\)): mean = variance = \\(\\lambda\\). Check if variance ≈ mean. If variance >> mean (**overdispersion**), use **Negative Binomial** which has an extra parameter for overdispersion. If data has excessive zeros (more than Poisson predicts), use **Zero-Inflated Poisson (ZIP)** or **Hurdle models**. For rates (events per exposure), use Poisson regression with an offset term. In practice, always check for overdispersion first — most real count data is overdispersed."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "Explain CLT. Why does it matter for data science?",
   "body": [
    {
     "t": "p",
     "text": "**A:** CLT says the distribution of sample means approaches Normal regardless of the population distribution, with mean \\(\\mu\\) and standard error \\(\\sigma/\\sqrt{n}\\). It matters because: (1) it justifies Normal-based hypothesis tests and CIs even when data isn't Normal, (2) it explains why the Normal distribution appears everywhere — many things are sums/averages of independent variables, (3) it quantifies how precision improves with \\(\\sqrt{n}\\) (diminishing returns — 4× data to halve uncertainty). Limitation: requires \\(n \\geq 30\\) for moderate skewness, more for extreme distributions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "How would you design an A/B test for a new checkout flow?",
   "body": [
    {
     "t": "p",
     "text": "**A:**"
    },
    {
     "t": "ol",
     "items": [
      "**Metric:** Conversion rate (primary), revenue per visitor (secondary), page load time (guardrail)",
      "**Hypotheses:** H₀: no difference in conversion. H₁: new flow has different conversion.",
      "**Sample size:** Power analysis — if baseline is 10% and MDE is 5% relative lift (to 10.5%), need ~31K per group at 80% power.",
      "**Duration:** At 5K visitors/day, run for ~13 days. Minimum 2 full weeks for weekly cycles.",
      "**Randomization:** User-level (cookie/user ID), not session-level.",
      "**Run:** No peeking! Monitor guardrail metrics only.",
      "**Analyze:** Two-proportion z-test, CI for the lift, check SRM.",
      "**Decide:** If significant AND practically meaningful → ship."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "Type I vs Type II — which is worse? Give an example.",
   "body": [
    {
     "t": "p",
     "text": "**A:** Depends on context. **Type I** (false positive): concluding an effect exists when it doesn't — e.g., approving an ineffective drug. **Type II** (false negative): missing a real effect — e.g., failing to detect a working drug. In cancer screening, Type II is worse (miss a cancer → patient dies). In criminal justice, Type I is worse (convict an innocent person). In A/B testing, Type I means shipping a change that doesn't help (revenue neutral, but wasted engineering effort). Trade-off: reducing one increases the other unless you increase sample size."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What is the bootstrap and when would you use it?",
   "body": [
    {
     "t": "p",
     "text": "**A:** Bootstrap resamples from your data WITH replacement to estimate the sampling distribution of ANY statistic. Use it when: (1) no analytical formula exists for the CI (e.g., median, ratio, custom metrics), (2) distributional assumptions are questionable, (3) sample size is small and CLT may not apply. Algorithm: resample B times (B=10,000), compute statistic each time, use percentiles for CI. Advantages: distribution-free, works for any statistic. Limitations: still needs representative sample, fails for extreme quantiles with small n."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "You run 20 A/B tests and 3 show p < 0.05. What do you do?",
   "body": [
    {
     "t": "p",
     "text": "**A:** With 20 tests at α=0.05, we'd expect 1 false positive even with no real effects (\\(20 \\times 0.05 = 1\\)). Three significant results at this rate isn't alarming but needs correction. Apply **Benjamini-Hochberg** correction to control the False Discovery Rate. If a test survives BH correction, it's likely real. Also consider: (1) the effect sizes — are they practically meaningful? (2) domain knowledge — do the results make sense? (3) can you replicate on a new sample? Never blindly trust p < 0.05 from mass testing."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "Explain the relationship between confidence intervals and hypothesis tests.",
   "body": [
    {
     "t": "p",
     "text": "**A:** They're mathematically equivalent. A 95% CI contains all parameter values that would NOT be rejected by a two-sided test at α=0.05. If the CI for a mean difference excludes 0, the corresponding t-test will have p < 0.05. CI advantage: it shows the range of plausible effect sizes, not just a binary yes/no. A CI of [0.001, 0.003] is \"significant\" but practically meaningless. A CI of [2.0, 8.0] is significant AND practically meaningful. Always report CIs alongside p-values."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

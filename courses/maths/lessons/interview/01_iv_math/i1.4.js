/* ============================================================================
   INTERVIEW I1.4 — Section 4: Statistics
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/02_Mathematics_and_Statistics/00_Interview_Bank/01_Math_and_Stats_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.4",
 "lede": "**20 questions** from Mathematics and Statistics Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Section 4: Statistics",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "51",
   "q": "What is a hypothesis test? Explain the steps.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**State hypotheses:** \\(H_0\\) (null — no effect) vs \\(H_1\\) (alternative — effect exists)",
      "**Choose significance level** \\(\\alpha\\) (typically 0.05)",
      "**Select test statistic** (z, t, chi-squared, F)",
      "**Compute p-value:** Probability of observing data this extreme under \\(H_0\\)",
      "**Decision:** Reject \\(H_0\\) if \\(p < \\alpha\\)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "52",
   "q": "What are Type I and Type II errors?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "",
      "\\(H_0\\) true",
      "\\(H_0\\) false"
     ],
     "rows": [
      [
       "Reject \\(H_0\\)",
       "**Type I (α)** — False positive",
       "Correct (Power = \\(1-\\beta\\))"
      ],
      [
       "Fail to reject",
       "Correct",
       "**Type II (β)** — False negative"
      ]
     ]
    },
    {
     "t": "ul",
     "items": [
      "Type I rate = significance level \\(\\alpha\\)",
      "Power = \\(1 - \\beta\\) = probability of detecting a real effect",
      "Reducing \\(\\alpha\\) increases \\(\\beta\\) (trade-off)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "53",
   "q": "What is a p-value? Common misconceptions?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** The p-value is the probability of observing data as extreme as (or more extreme than) what was observed, **assuming \\(H_0\\) is true**."
    },
    {
     "t": "p",
     "text": "**Misconceptions:**"
    },
    {
     "t": "ul",
     "items": [
      "❌ \"p-value is the probability \\(H_0\\) is true\" — it's not, that would require Bayes' theorem",
      "❌ \"p = 0.05 means 5% chance of being wrong\" — wrong interpretation",
      "❌ \"\\(p > 0.05\\) means no effect\" — it means insufficient evidence, not absence of effect",
      "❌ \"Smaller p-value = larger effect\" — p-value depends on sample size too"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "54",
   "q": "What is statistical power and how do you calculate sample size?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Power = \\(P(\\text{reject } H_0 | H_0 \\text{ is false}) = 1 - \\beta\\). Typical target: 80%."
    },
    {
     "t": "p",
     "text": "**Sample size formula for two-sample t-test:**"
    },
    {
     "t": "math",
     "tex": "n = \\frac{2(z_{\\alpha/2} + z_\\beta)^2 \\sigma^2}{\\delta^2}"
    },
    {
     "t": "p",
     "text": "Where \\(\\delta\\) = minimum detectable effect, \\(\\sigma\\) = standard deviation."
    },
    {
     "t": "p",
     "text": "**Factors increasing required \\(n\\):** Smaller effect size, higher power, lower \\(\\alpha\\), higher variance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "55",
   "q": "Compare parametric vs non-parametric tests.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Parametric",
      "Non-parametric",
      "When to use non-parametric"
     ],
     "rows": [
      [
       "t-test",
       "Mann-Whitney U",
       "Small sample, non-normal data"
      ],
      [
       "Paired t-test",
       "Wilcoxon signed-rank",
       "Paired non-normal data"
      ],
      [
       "ANOVA",
       "Kruskal-Wallis",
       "3+ groups, non-normal"
      ],
      [
       "Pearson correlation",
       "Spearman correlation",
       "Ordinal data or outliers"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "56",
   "q": "What is a confidence interval?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** A 95% confidence interval means: if we repeated the experiment many times, 95% of the computed intervals would contain the true parameter."
    },
    {
     "t": "math",
     "tex": "CI = \\bar{x} \\pm z_{\\alpha/2} \\cdot \\frac{s}{\\sqrt{n}}"
    },
    {
     "t": "p",
     "text": "**Common misconception:** \"There's a 95% probability the true value is in this interval\" — the true value is fixed, not random. The interval is random."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "57",
   "q": "Explain A/B testing and common pitfalls.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** A/B testing compares a control (A) against a variant (B) to measure the effect of a change."
    },
    {
     "t": "p",
     "text": "**Steps:** Define metric → Calculate sample size → Randomize → Run → Analyze"
    },
    {
     "t": "p",
     "text": "**Pitfalls:**"
    },
    {
     "t": "table",
     "head": [
      "Pitfall",
      "Impact",
      "Solution"
     ],
     "rows": [
      [
       "Peeking at results early",
       "Inflated false positive rate",
       "Sequential testing (always valid p-values)"
      ],
      [
       "Multiple comparisons",
       "More false positives",
       "Bonferroni/Holm correction, FDR control"
      ],
      [
       "Novelty/primacy effects",
       "Temporary effect",
       "Run longer, filter new users"
      ],
      [
       "Sample ratio mismatch",
       "Biased results",
       "Check randomization integrity"
      ],
      [
       "Simpson's paradox",
       "Misleading aggregate results",
       "Segment analysis"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "58",
   "q": "What is the bootstrap method?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Bootstrap resamples data **with replacement** to estimate the sampling distribution of a statistic."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\ndata = np.array([...])\nboot_means = [np.mean(np.random.choice(data, size=len(data), replace=True)) for _ in range(10000)]\nci_lower, ci_upper = np.percentile(boot_means, [2.5, 97.5])"
    },
    {
     "t": "p",
     "text": "**Advantages:** No distributional assumptions, works for any statistic (median, quantiles, etc.), simple to implement."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "59",
   "q": "What is the chi-squared test?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Tests whether observed frequencies differ from expected frequencies:"
    },
    {
     "t": "math",
     "tex": "\\chi^2 = \\sum \\frac{(O_i - E_i)^2}{E_i}"
    },
    {
     "t": "p",
     "text": "**Uses:**"
    },
    {
     "t": "ul",
     "items": [
      "**Goodness-of-fit:** Does data follow an expected distribution?",
      "**Independence:** Are two categorical variables independent? (contingency table)",
      "**Homogeneity:** Do multiple groups have the same distribution?"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "60",
   "q": "What is ANOVA and when do you use it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** ANOVA (Analysis of Variance) tests whether means of 3+ groups differ significantly."
    },
    {
     "t": "math",
     "tex": "F = \\frac{\\text{Between-group variance}}{\\text{Within-group variance}} = \\frac{MS_{\\text{between}}}{MS_{\\text{within}}}"
    },
    {
     "t": "ul",
     "items": [
      "**One-way ANOVA:** One factor, multiple levels",
      "**Two-way ANOVA:** Two factors, interaction effects",
      "**Assumptions:** Normality, homogeneity of variance, independence",
      "**Post-hoc:** Tukey's HSD, Bonferroni for pairwise comparisons"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "61",
   "q": "Explain correlation vs causation.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Correlation measures linear association. Causation means one variable directly affects another."
    },
    {
     "t": "p",
     "text": "**Why correlation ≠ causation:**"
    },
    {
     "t": "ul",
     "items": [
      "**Confounding:** Ice cream sales and drowning deaths both increase in summer (confounder: temperature)",
      "**Reverse causation:** Hospital visits and death are correlated, but hospitals don't cause death",
      "**Selection bias:** Only observing a subset of the population"
     ]
    },
    {
     "t": "p",
     "text": "**Establishing causation:** RCTs (randomized controlled trials), instrumental variables, difference-in-differences, causal graphs (do-calculus)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "62",
   "q": "What is the multiple comparisons problem?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Testing \\(m\\) hypotheses at \\(\\alpha = 0.05\\): probability of at least one false positive = \\(1 - (1-\\alpha)^m\\)."
    },
    {
     "t": "p",
     "text": "For \\(m = 20\\): \\(P(\\text{≥1 false positive}) = 1 - 0.95^{20} = 0.64\\) (64%!)"
    },
    {
     "t": "p",
     "text": "**Corrections:**"
    },
    {
     "t": "table",
     "head": [
      "Method",
      "Type",
      "Formula",
      "Conservatism"
     ],
     "rows": [
      [
       "Bonferroni",
       "FWER",
       "\\(\\alpha/m\\)",
       "Very conservative"
      ],
      [
       "Holm-Bonferroni",
       "FWER",
       "Step-down procedure",
       "Less conservative"
      ],
      [
       "Benjamini-Hochberg",
       "FDR",
       "Controls false discovery rate",
       "Least conservative"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "63",
   "q": "What is Bayesian inference?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Update beliefs about parameters using data:"
    },
    {
     "t": "math",
     "tex": "P(\\theta|D) = \\frac{P(D|\\theta) P(\\theta)}{P(D)} \\propto \\text{likelihood} \\times \\text{prior}"
    },
    {
     "t": "p",
     "text": "**Process:**"
    },
    {
     "t": "ol",
     "items": [
      "Choose prior \\(P(\\theta)\\) — encodes domain knowledge",
      "Observe data → compute likelihood \\(P(D|\\theta)\\)",
      "Compute posterior \\(P(\\theta|D)\\)",
      "Make predictions: \\(P(x_{\\text{new}}|D) = \\int P(x_{\\text{new}}|\\theta) P(\\theta|D) d\\theta\\)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "64",
   "q": "What is the difference between confidence interval and credible interval?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Confidence Interval (Frequentist)",
      "Credible Interval (Bayesian)"
     ],
     "rows": [
      [
       "95% of intervals from repeated experiments contain the true value",
       "95% probability the parameter is in this interval"
      ],
      [
       "Parameter is fixed, interval is random",
       "Parameter is random, interval is fixed given data"
      ],
      [
       "Does not use priors",
       "Incorporates prior knowledge"
      ],
      [
       "Interpretation is about the procedure",
       "Interpretation is about the parameter"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "65",
   "q": "What is the F-test?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Compares two variances (or explained vs unexplained variance):"
    },
    {
     "t": "math",
     "tex": "F = \\frac{s_1^2}{s_2^2} \\sim F(df_1, df_2)"
    },
    {
     "t": "p",
     "text": "**Uses:**"
    },
    {
     "t": "ul",
     "items": [
      "ANOVA (comparing group means)",
      "Testing if a regression model is significant (\\(F\\)-statistic in regression output)",
      "Comparing two models (partial F-test for nested models)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "66",
   "q": "What are effect sizes and why do they matter?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Effect size quantifies the magnitude of a difference, independent of sample size."
    },
    {
     "t": "table",
     "head": [
      "Measure",
      "Formula",
      "Small / Medium / Large"
     ],
     "rows": [
      [
       "Cohen's d",
       "\\(\\frac{\\bar{x}_1 - \\bar{x}_2}{s_{\\text{pooled}}}\\)",
       "0.2 / 0.5 / 0.8"
      ],
      [
       "Pearson's r",
       "Correlation coefficient",
       "0.1 / 0.3 / 0.5"
      ],
      [
       "Odds ratio",
       "\\(\\frac{p_1/(1-p_1)}{p_2/(1-p_2)}\\)",
       "Context-dependent"
      ],
      [
       "Cohen's h",
       "\\(2\\arcsin\\sqrt{p_1} - 2\\arcsin\\sqrt{p_2}\\)",
       "0.2 / 0.5 / 0.8"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Why it matters:** With large \\(n\\), even trivial differences become statistically significant. Effect size tells you if the difference is **practically meaningful**."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "67",
   "q": "What is Simpson's Paradox?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** A trend that appears in several groups reverses when the groups are combined."
    },
    {
     "t": "p",
     "text": "**Classic example:** UC Berkeley admission data showed overall bias against women, but within each department, women had equal or higher admission rates. The paradox arose because women applied to more competitive departments."
    },
    {
     "t": "p",
     "text": "**ML lesson:** Always check for confounders. Aggregate statistics can be misleading."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "68",
   "q": "What is survival analysis?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Analyzes time-to-event data (churn, death, failure), handling censored observations (event hasn't happened yet)."
    },
    {
     "t": "p",
     "text": "**Key concepts:**"
    },
    {
     "t": "ul",
     "items": [
      "**Survival function:** \\(S(t) = P(T > t)\\)",
      "**Hazard function:** \\(h(t) = \\lim_{\\Delta t \\to 0} \\frac{P(t \\leq T < t+\\Delta t | T \\geq t)}{\\Delta t}\\)",
      "**Kaplan-Meier estimator:** Non-parametric survival curve",
      "**Cox proportional hazards:** Semi-parametric model relating covariates to hazard"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "69",
   "q": "What is the Kolmogorov-Smirnov test?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Tests whether a sample comes from a specified distribution (one-sample) or whether two samples come from the same distribution (two-sample)."
    },
    {
     "t": "math",
     "tex": "D = \\max_x |F_n(x) - F_0(x)|"
    },
    {
     "t": "p",
     "text": "Where \\(F_n\\) is the empirical CDF and \\(F_0\\) is the reference CDF. Non-parametric, works for continuous distributions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "70",
   "q": "Explain the concept of sufficient statistics.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** A statistic \\(T(X)\\) is sufficient for \\(\\theta\\) if \\(P(X|T(X), \\theta) = P(X|T(X))\\) — the statistic captures all information about \\(\\theta\\) from the data."
    },
    {
     "t": "p",
     "text": "**Examples:**"
    },
    {
     "t": "ul",
     "items": [
      "For Gaussian with known \\(\\sigma\\): \\(\\bar{x}\\) is sufficient for \\(\\mu\\)",
      "For Bernoulli: \\(\\sum x_i\\) is sufficient for \\(p\\)"
     ]
    },
    {
     "t": "p",
     "text": "**Why it matters:** You can reduce data to sufficient statistics without losing information. Neural network embeddings can be viewed as learned sufficient statistics."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

/* ============================================================================
   INTERVIEW I1.5 — Section 5: A/B Testing
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/02_Mathematics_and_Statistics/00_Interview_Bank/01_Math_and_Stats_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.5",
 "lede": "**15 questions** from Mathematics and Statistics Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Section 5: A/B Testing",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "71",
   "q": "How do you determine sample size for an A/B test?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** For a two-proportion test (e.g., conversion rates):"
    },
    {
     "t": "math",
     "tex": "n = \\frac{(z_{\\alpha/2} + z_\\beta)^2 \\cdot [p_1(1-p_1) + p_2(1-p_2)]}{(p_1 - p_2)^2}"
    },
    {
     "t": "p",
     "text": "**Typical inputs:**"
    },
    {
     "t": "ul",
     "items": [
      "\\(\\alpha = 0.05\\) (\\(z = 1.96\\)), Power = 0.80 (\\(z_\\beta = 0.84\\))",
      "Baseline conversion = 5%, MDE (minimum detectable effect) = 0.5% (relative 10%)"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from statsmodels.stats.power import NormalIndPower\nanalysis = NormalIndPower()\nn = analysis.solve_power(effect_size=0.1, alpha=0.05, power=0.8, alternative='two-sided')"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "72",
   "q": "What is sequential testing?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Allows you to check results continuously without inflating the false positive rate. Methods:"
    },
    {
     "t": "ul",
     "items": [
      "**O'Brien-Fleming:** Conservative early boundaries, liberal later",
      "**Pocock:** Equal boundaries at each look",
      "**Always-valid p-values:** Based on martingale theory",
      "**Bayesian sequential:** Update posterior continuously, stop when credible interval excludes null"
     ]
    },
    {
     "t": "p",
     "text": "**Advantage:** Can stop early if effect is large, saving time and resources."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "73",
   "q": "How do you handle multiple metrics in A/B testing?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Primary metric:** One pre-defined metric for the decision (power-optimized)",
      "**Guardrail metrics:** Must not degrade (e.g., latency, crash rate)",
      "**Secondary metrics:** Explore but don't decide on",
      "**Correction:** Bonferroni for few metrics, FDR for many, or use an Overall Evaluation Criterion (OEC)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "74",
   "q": "What is the novelty effect?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Users may engage more (or less) with a new feature simply because it's new. This inflates the initial treatment effect."
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "ul",
     "items": [
      "Run the test longer (2+ weeks minimum)",
      "Analyze only users who joined after the experiment started",
      "Look for effect decay over time",
      "Use hold-back experiments (keep some users on the old version permanently)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "75",
   "q": "Explain network effects in A/B testing.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** When users interact (social networks, marketplaces), treating one user affects others → violation of SUTVA (Stable Unit Treatment Value Assumption)."
    },
    {
     "t": "p",
     "text": "**Example:** Testing a new messaging feature — treated user's messages affect control users."
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "ul",
     "items": [
      "**Cluster randomization:** Randomize at the cluster level (e.g., geographic regions)",
      "**Ego-network randomization:** Treat entire friend groups",
      "**Switchback experiments:** Alternate treatment over time periods"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "76",
   "q": "How do you handle ratio metrics (e.g., revenue per user)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Ratio metrics (\\(\\frac{\\sum \\text{revenue}_i}{\\sum \\text{users}_i}\\)) have non-obvious variances. Don't use normal z-test directly."
    },
    {
     "t": "p",
     "text": "**Methods:**"
    },
    {
     "t": "ul",
     "items": [
      "**Delta method:** Approximate variance of the ratio",
      "**Bootstrap:** Resample user-level data, compute ratio each time",
      "**Linearization:** Convert ratio to user-level metric: \\(\\hat{\\theta}_i = y_i - \\hat{R} \\cdot x_i\\)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "77",
   "q": "What is CUPED (Controlled-experiment Using Pre-Experiment Data)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Variance reduction technique using pre-experiment data as a covariate:"
    },
    {
     "t": "math",
     "tex": "\\hat{Y}_{\\text{adj}} = Y - \\theta(X_{\\text{pre}} - \\bar{X}_{\\text{pre}})"
    },
    {
     "t": "p",
     "text": "Where \\(\\theta = \\frac{\\text{Cov}(Y, X_{\\text{pre}})}{\\text{Var}(X_{\\text{pre}})}\\)."
    },
    {
     "t": "p",
     "text": "**Benefit:** Reduces variance by 50%+ → need smaller sample size → faster experiments. Used at Microsoft, Netflix, Uber."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "78",
   "q": "When should you use Bayesian A/B testing?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "When you want probability statements (\"90% chance B is better than A\")",
      "When you need to stop early without alpha inflation",
      "When you have informative priors (e.g., previous experiments)",
      "When stakeholders want intuitive results (posterior probability > p-values)"
     ]
    },
    {
     "t": "p",
     "text": "**Thompson sampling** for multi-armed bandits: allocate more traffic to the winning variant automatically."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "79",
   "q": "What is an interaction effect in A/B testing?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** When the effect of one treatment depends on another. E.g., a new UI works well on mobile but not desktop."
    },
    {
     "t": "p",
     "text": "**Detection:** Run multi-factor experiments (2x2 design). Test interaction term in regression:"
    },
    {
     "t": "math",
     "tex": "Y = \\beta_0 + \\beta_1 X_1 + \\beta_2 X_2 + \\beta_{12} X_1 X_2 + \\epsilon"
    },
    {
     "t": "p",
     "text": "If \\(\\beta_{12}\\) is significant, there's an interaction."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "80",
   "q": "How do you handle non-normal metrics?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "For large samples: CLT makes the test statistic approximately normal",
      "For small samples or heavy tails:",
      "— **Log-transform** (for right-skewed metrics like revenue)",
      "— **Winsorize** (cap extreme values at 99th percentile)",
      "— **Bootstrap** confidence intervals",
      "— **Non-parametric tests** (Mann-Whitney U)",
      "— **Permutation tests** (exact, no distributional assumptions)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "81",
   "q": "What is a sample ratio mismatch (SRM)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** When the actual split differs from the intended split (e.g., 52/48 instead of 50/50). Detected via chi-squared test."
    },
    {
     "t": "p",
     "text": "**Causes:** Bot filtering, redirect failures, sticky assignment bugs, browser-level vs user-level randomization inconsistencies."
    },
    {
     "t": "p",
     "text": "**Action:** Never trust results with SRM. Debug the randomization system first."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "82",
   "q": "What are guardrail metrics?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Metrics that must not degrade during an experiment, even if the primary metric improves."
    },
    {
     "t": "p",
     "text": "**Examples:**"
    },
    {
     "t": "table",
     "head": [
      "Type",
      "Examples"
     ],
     "rows": [
      [
       "Performance",
       "Page load time, latency"
      ],
      [
       "Quality",
       "Error rate, crash rate"
      ],
      [
       "Engagement",
       "Session length, return rate"
      ],
      [
       "Business",
       "Revenue per user, unsubscribe rate"
      ]
     ]
    },
    {
     "t": "p",
     "text": "Set one-sided tests with higher power (e.g., 95%) for guardrails."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "83",
   "q": "Explain variance reduction techniques for A/B tests.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Technique",
      "How it works",
      "Variance reduction"
     ],
     "rows": [
      [
       "CUPED",
       "Pre-experiment covariate adjustment",
       "30-50%"
      ],
      [
       "Stratified sampling",
       "Randomize within strata (country, platform)",
       "10-30%"
      ],
      [
       "Paired testing",
       "Compare within matched pairs",
       "Depends on correlation"
      ],
      [
       "Triggered analysis",
       "Analyze only triggered users",
       "Removes noise from untriggered"
      ],
      [
       "Winsorization",
       "Cap extreme values",
       "Reduces heavy-tail impact"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "84",
   "q": "How do you analyze a test that ran shorter than planned?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Do not** use the standard test — underpowered",
      "**Options:**",
      "— Report effect size and confidence interval (may be wide)",
      "— Use Bayesian analysis with informative priors",
      "— Use sequential testing framework (if pre-planned)",
      "— Extend the test if possible",
      "— Use CUPED to reduce variance and recover power"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "85",
   "q": "What is the difference between one-tailed and two-tailed tests?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**One-tailed:** Tests if effect is in one direction (\\(H_1: \\mu > \\mu_0\\)). More power for that direction.",
      "**Two-tailed:** Tests if effect exists in either direction (\\(H_1: \\mu \\neq \\mu_0\\)). More conservative."
     ]
    },
    {
     "t": "p",
     "text": "**Rule:** Use two-tailed unless you have a strong prior reason to test only one direction. In A/B testing, two-tailed is standard."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

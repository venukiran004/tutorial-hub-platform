/* ============================================================================
   PRACTICE P1.1 — A/B Testing & Experimentation
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/02_Mathematics_and_Statistics/Practice/01_Math_and_Stats_Scenarios.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p1.1",
 "lede": "**10 questions** from Mathematics and Statistics Scenarios. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "A/B Testing & Experimentation",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "1",
   "q": "Statistically Significant but Practically Meaningless",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You run an A/B test on a checkout button color. With 2 million users, you get p = 0.01 and a conversion rate increase from 4.50% to 4.53%."
    },
    {
     "t": "p",
     "text": "**Question:** The PM wants to ship it. What do you advise?"
    },
    {
     "t": "p",
     "text": "**Answer:** The lift is 0.03 percentage points (0.67% relative). While statistically significant (large sample → tiny differences become significant), the effect is **practically meaningless**."
    },
    {
     "t": "p",
     "text": "**Steps:**"
    },
    {
     "t": "ol",
     "items": [
      "Compute Cohen's h: \\(h = 2\\arcsin(\\sqrt{0.0453}) - 2\\arcsin(\\sqrt{0.0450}) \\approx 0.0014\\) — negligible",
      "Estimate business impact: 0.03% × estimated annual revenue. If revenue = $100M, impact = $30K/year",
      "Weigh against engineering cost of shipping, maintaining, and testing",
      "Check guardrail metrics (latency, engagement, error rates)"
     ]
    },
    {
     "t": "p",
     "text": "**Recommendation:** Don't ship unless the implementation is trivial. The effect is real but too small to matter. Invest time in higher-impact experiments."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "Multiple Testing Disaster",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your team tested 20 different UI variations simultaneously. Three show p < 0.05. The PM celebrates."
    },
    {
     "t": "p",
     "text": "**Question:** Why should you be cautious?"
    },
    {
     "t": "p",
     "text": "**Answer:** With 20 tests at α = 0.05, expected false positives = 20 × 0.05 = 1. The probability of at least one false positive = \\(1 - 0.95^{20} = 0.64\\) (64%)."
    },
    {
     "t": "p",
     "text": "**Fix:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from statsmodels.stats.multitest import multipletests\np_values = [0.01, 0.03, 0.04, 0.08, 0.12, ...]  # all 20\nreject, adjusted_p, _, _ = multipletests(p_values, method='fdr_bh')\n# Only trust results where reject[i] = True"
    },
    {
     "t": "p",
     "text": "After Benjamini-Hochberg correction at FDR = 0.05, likely only the p = 0.01 result survives. Report adjusted p-values to the PM."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "Peeking at Results",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your A/B test was designed for 4 weeks, but after 1 week the PM checks and sees p = 0.03. They want to stop early and declare a winner."
    },
    {
     "t": "p",
     "text": "**Question:** What's wrong with this approach?"
    },
    {
     "t": "p",
     "text": "**Answer:** **Peeking inflates the false positive rate.** If you check every day for 28 days at α = 0.05, the actual Type I error can be 20–30%."
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "ol",
     "items": [
      "Use **sequential testing** (designed for continuous monitoring): O'Brien-Fleming or alpha-spending functions",
      "Use **always-valid confidence sequences** (based on e-values)",
      "If already peeked, acknowledge the inflated error and run to completion",
      "Use Bayesian framework with posterior probability of superiority"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "Simpson's Paradox in A/B Test",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your global A/B test shows treatment wins (+2% conversion). But when you segment by mobile vs desktop, treatment loses in BOTH segments."
    },
    {
     "t": "p",
     "text": "**Question:** How is this possible? What do you do?"
    },
    {
     "t": "p",
     "text": "**Answer:** **Simpson's Paradox.** The treatment group has more mobile users (who have higher baseline conversion). The treatment is actually worse within each platform."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "               Control    Treatment\nMobile users:   30%         70%        (mobile converts at 8%)\nDesktop users:  70%         30%        (desktop converts at 3%)\n\nGlobal average looks higher for treatment because more\nof its users are in the high-converting mobile group."
    },
    {
     "t": "p",
     "text": "**Fix:** Check for sample ratio mismatch by segment. Analyze per-segment results. The treatment should NOT be shipped — it hurts both segments."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "Underpowered Test",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You ran a test for 2 weeks with 5,000 users per group. The observed lift is +3% but p = 0.15."
    },
    {
     "t": "p",
     "text": "**Question:** Your manager says \"the test failed — no effect.\" Do you agree?"
    },
    {
     "t": "p",
     "text": "**Answer:** **No.** Failing to reject \\(H_0\\) ≠ proving no effect. The test may be underpowered."
    },
    {
     "t": "p",
     "text": "**Analysis:**"
    },
    {
     "t": "ol",
     "items": [
      "Compute achieved power: With n = 5000 and baseline conversion 5%, power to detect 3% relative lift ≈ 35% — severely underpowered",
      "Required sample: ~50,000 per group for 80% power at this effect size",
      "Report confidence interval: if CI = [-1%, +7%], the data is consistent with both no effect AND a meaningful +7% effect"
     ]
    },
    {
     "t": "p",
     "text": "**Recommendation:** Either extend the test, use CUPED for variance reduction, or acknowledge the test was inconclusive (not negative)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "Novelty Effect Confusion",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You launched a new recommendation algorithm. Week 1: +15% CTR. Week 2: +8%. Week 3: +3%. Week 4: +1%."
    },
    {
     "t": "p",
     "text": "**Question:** What's happening and how do you get the true effect?"
    },
    {
     "t": "p",
     "text": "**Answer:** Classic **novelty effect** — users click more because it's new, not because it's better."
    },
    {
     "t": "p",
     "text": "**Approach:**"
    },
    {
     "t": "ol",
     "items": [
      "Plot effect by cohort (users who saw treatment first time in week 1, 2, 3, 4)",
      "Look at \"mature users\" — those exposed for 3+ weeks",
      "Run a holdback: keep 5% of users permanently on old algorithm",
      "Measure steady-state effect after novelty wears off (typically 3-4 weeks)",
      "The true long-term effect is likely +1-2%, not +15%"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "Skewed Revenue Metric",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your A/B test shows +5% average revenue per user, but the median revenue is unchanged. A few whale users in the treatment group skew the average."
    },
    {
     "t": "p",
     "text": "**Question:** How do you handle this?"
    },
    {
     "t": "p",
     "text": "**Answer:** Revenue is typically heavy-tailed. A few extreme values dominate the mean."
    },
    {
     "t": "p",
     "text": "**Approaches:**"
    },
    {
     "t": "ol",
     "items": [
      "**Winsorize** at 99th percentile: cap extreme values, then compare means",
      "**Log-transform:** Compare geometric means (more robust to outliers)",
      "**Bootstrap:** Get CI for the difference in means with proper uncertainty",
      "**Report multiple metrics:** Mean, median, P75, P95 — full picture",
      "**Delta method:** Properly estimate variance of revenue-per-user ratio"
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n# Winsorize\np99 = np.percentile(revenue, 99)\nrevenue_winsorized = np.clip(revenue, 0, p99)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "Network Effects in A/B Test",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** You're testing a new messaging feature. Treated users send messages to control users, contaminating the control group."
    },
    {
     "t": "p",
     "text": "**Question:** How do you design a clean experiment?"
    },
    {
     "t": "p",
     "text": "**Answer:** SUTVA (Stable Unit Treatment Value Assumption) is violated — treatment spills over."
    },
    {
     "t": "p",
     "text": "**Solutions:**"
    },
    {
     "t": "ol",
     "items": [
      "**Cluster randomization:** Randomize by geography, team, or social cluster",
      "**Graph cluster randomization:** Use community detection to identify groups with few cross-connections",
      "**Switchback design:** Alternate treatment/control across time periods for the entire population",
      "**Interference model:** Explicitly model the spillover as a function of fraction of treated neighbors"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "Conflicting Metrics",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your A/B test shows: engagement +10%, revenue -3%, churn +2%."
    },
    {
     "t": "p",
     "text": "**Question:** Should you ship?"
    },
    {
     "t": "p",
     "text": "**Answer:** This is a classic metrics trade-off. More engagement but lower revenue and higher churn — likely engagement is low-quality (e.g., clickbait)."
    },
    {
     "t": "p",
     "text": "**Framework:**"
    },
    {
     "t": "ol",
     "items": [
      "Check primary metric (should be pre-defined before the test)",
      "Revenue and churn are critical guardrails — **-3% revenue and +2% churn are red flags**",
      "Investigate what type of engagement increased (sessions? time? actions?)",
      "Compute long-term impact: short-term engagement boost may cause long-term churn",
      "**Recommendation:** Do NOT ship. Engagement without retention destroys value."
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "Sample Ratio Mismatch",
   "body": [
    {
     "t": "p",
     "text": "**Situation:** Your 50/50 A/B test ended up with 52.3% in treatment, 47.7% in control. Chi-squared test gives p < 0.001."
    },
    {
     "t": "p",
     "text": "**Question:** Can you still trust the results?"
    },
    {
     "t": "p",
     "text": "**Answer:** **No.** An SRM this severe (with p < 0.001) indicates a systematic bug:"
    },
    {
     "t": "ul",
     "items": [
      "Browser redirect failures",
      "Bot filtering affecting groups differently",
      "Assignment logic bug",
      "Race condition in user bucketing"
     ]
    },
    {
     "t": "p",
     "text": "**Action:**"
    },
    {
     "t": "ol",
     "items": [
      "Invalidate the experiment results — do not interpret metrics",
      "Debug: check assignment logs, browser distributions, bot ratios by group",
      "Fix the root cause",
      "Re-run the experiment from scratch"
     ]
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

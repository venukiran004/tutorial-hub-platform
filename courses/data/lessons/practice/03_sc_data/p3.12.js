/* ============================================================================
   PRACTICE P3.12 — Predict the Output / Scenarios · 12
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p3.12",
 "lede": "**25 scenarios** from Data Science Scenarios. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
 "objectives": [
  "Answer each question as you would in the interview, then compare against the worked answer",
  "Lead with the definition and the formula, then the trade-off",
  "Follow up on your own answer with the question an interviewer would ask next",
  "Note which questions you could not answer and return to the lesson that covers them"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "h2",
   "n": "01",
   "text": "Predict the Output / Scenarios · 12",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "276",
   "q": "You need to compare model performance across 10 datasets. A table would be hard to read. What visualization do you use?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Heatmap: models × datasets, colored by metric value, (2) critical difference diagram (from Demšar test) — shows statistical groupings, (3) bump chart: rank each model per dataset, connect across datasets, (4) box plot: distribution of metric across datasets per model, (5) parallel coordinates plot, (6) radar chart per dataset, small multiples layout, (7) summary table with rank aggregation (average rank, win count)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "277",
   "q": "Your confusion matrix for a 20-class classifier is hard to interpret. How do you make it readable?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Normalize rows (show percentages instead of counts), (2) only show cells above a threshold (suppress near-zero values), (3) hierarchical: group related classes, show aggregated confusion first, (4) color intensity proportional to value, (5) sort classes by confusion similarity, (6) extract key insights: top-5 confused pairs as a separate table, (7) show precision/recall per class as a simple bar chart alongside, (8) interactive version with hover details."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "278",
   "q": "You're presenting an A/B test result. The PM wants to see \"the data proves we should launch.\" How do you present objectively?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Present the data, not the conclusion: \"here's what we found,\" (2) show confidence intervals — does the interval include 0?, (3) present both wins and losses per metric, (4) segment analysis: who benefits, who doesn't, (5) sensitivity analysis: how robust is the conclusion?, (6) present the minimum detectable effect vs. observed effect, (7) be explicit about limitations and caveats, (8) separate data presentation from recommendation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "279",
   "q": "Your ROC curve shows AUC = 0.85. The stakeholder asks \"so the model is 85% accurate?\" How do you clarify?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** \"AUC is not accuracy. It means: if I randomly pick one positive and one negative example, the model correctly ranks the positive higher 85% of the time. It measures the model's ability to discriminate between classes across all possible thresholds. Accuracy depends on which threshold we choose. At our current threshold, accuracy is X%. Let me show you the precision-recall tradeoff at different thresholds so we can pick the one that matches our business priorities.\""
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "280",
   "q": "You need to explain correlation vs. causation to a business stakeholder using a real example from your analysis. How?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** \"We found that customers who use our mobile app more also spend more. But this doesn't mean forcing app downloads will increase spending. It could be that: (1) big spenders naturally use the app more, (2) a third factor (brand loyalty) drives both, (3) the app genuinely increases spending. To determine causation, we'd need to run an experiment: randomly encourage a group to use the app and measure if their spending actually increases compared to a control group.\""
    },
    {
     "t": "p",
     "text": "**Theme: Ethics & Responsible AI**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "281",
   "q": "Your hiring model was trained on historical data where 80% of hires were male. The model now favors male candidates. How do you fix this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Remove gender and gender-proxy features (name, sports, pronouns), (2) pre-processing: balance training data across genders, (3) in-processing: adversarial debiasing — model can't predict gender from features, (4) post-processing: separate thresholds per group to equalize selection rates, (5) evaluate with disparate impact ratio (should be 0.8-1.25), (6) re-examine what \"success\" means — are historical labels biased? (7) involve HR and legal teams, (8) regular bias audits."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "282",
   "q": "Your model achieves equal accuracy across demographic groups but has different false positive rates. Is this fair?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** No — equal accuracy doesn't guarantee fairness. Fairness metrics: (1) Equalized Odds: TPR and FPR should be equal across groups, (2) different FPR means one group faces more false accusations/denials, (3) in criminal justice: higher FPR for minorities means more wrongful actions, (4) in lending: higher FPR means more wrongful denials. Choose fairness metric based on context and stakeholder input. Note: it's mathematically impossible to satisfy all fairness metrics simultaneously (impossibility theorem)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "283",
   "q": "You're asked to build a model that predicts employee productivity. What ethical concerns should you raise?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Privacy: monitoring creates surveillance culture, reducing trust, (2) measurement validity: what's a fair proxy for \"productivity\"?, (3) bias: may discriminate against disabled, caregiving, or neurodiverse employees, (4) consent: do employees know they're being modeled?, (5) power dynamics: employees can't meaningfully opt out, (6) gaming: people optimize for the metric, not actual productivity, (7) feedback loops: low predicted productivity → less opportunity → lower actual productivity. Recommend careful scoping, transparency, and human oversight."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "284",
   "q": "Your recommendation system creates a filter bubble — users only see content reinforcing their existing views. How do you address this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Add diversity slots: recommend some content outside user's comfort zone, (2) calibration: match recommendation distribution to broader content distribution, (3) serendipity metric: track and optimize for surprising-but-relevant recommendations, (4) \"explore\" mode: occasional diverse recommendations, (5) topic diversification constraints, (6) transparency: show users why content was recommended, (7) editorial intervention for news/information to ensure balanced coverage."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "285",
   "q": "You discover your credit scoring model disproportionately denies loans to certain zip codes (proxy for race). What do you do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** This is redlining (illegal in many jurisdictions). Immediate actions: (1) remove zip code and correlated features (neighborhood income), (2) audit for proxy discrimination: which features correlate with protected attributes?, (3) test with fairness metrics: disparate impact ratio, equal opportunity, (4) consult legal/compliance team, (5) use fair lending frameworks (ECOA, Fair Housing Act), (6) implement ongoing monitoring for disparate impact, (7) consider using only permissible features per regulations."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "286",
   "q": "Your model's training data contains personal information (PII). What data governance practices should you implement?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Data minimization: only collect what's needed, (2) anonymization: remove direct identifiers, (3) pseudonymization: replace PII with tokens, (4) differential privacy for aggregate statistics, (5) access controls: role-based access, audit logs, (6) retention policy: delete data after purpose is fulfilled, (7) consent management: track data usage consents, (8) data processing agreements (DPAs) with third parties, (9) GDPR/CCPA compliance: right to erasure, data portability, (10) encrypt data at rest and in transit."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "287",
   "q": "Your autonomous system made a bad decision that harmed a user. Who is responsible? How do you prevent this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Responsibility is shared: (1) developer: for training data quality, testing, safety measures, (2) deployer: for appropriate use, monitoring, overrides, (3) organization: for governance and accountability. Prevention: (1) human-in-the-loop for high-stakes decisions, (2) bounded autonomy: limit model's action space, (3) fallback to safe defaults when uncertain, (4) explainability: understand why the decision was made, (5) regular testing with adversarial scenarios, (6) incident response and learning from failures."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "288",
   "q": "Your NLP model generates offensive content occasionally. How do you add safety guardrails?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Content filtering: check output against blocklist and safety classifiers, (2) constitutional AI: train model with harmlessness principles, (3) RLHF: human feedback on offensive outputs, (4) red teaming: systematically test for harmful outputs, (5) output validation layer before serving to users, (6) user reporting mechanism with fast response, (7) context-aware filtering (medical context allows different content than general), (8) regular safety evaluations on diverse test sets."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "289",
   "q": "A client asks you to build a model that predicts a person's religion from their social media posts. What do you do?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Refuse or raise serious concerns: (1) religion is a protected characteristic — using it for decisions is often illegal, (2) purpose matters: why predict religion? No legitimate business needs this, (3) potential for discrimination, targeting, persecution, (4) accuracy would be poor and stereotyping, (5) violates privacy expectations, (6) could be misused for profiling, (7) suggest the underlying business problem can likely be solved differently. Document your ethical objection and escalate if needed."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "290",
   "q": "You're deploying a facial recognition system. What ethical considerations must you address?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Accuracy disparities across demographics (worse for darker skin tones, women), (2) consent: do subjects know they're being scanned?, (3) surveillance concerns and civil liberties, (4) data security: biometric data can't be changed if breached, (5) legal compliance: GDPR, BIPA, local regulations, (6) error consequences: false match → wrongful detention?, (7) scope creep: system deployed for one purpose, used for another, (8) disproportionate impact on marginalized communities. Implement: regular bias audits, transparency reports, human oversight, appeal mechanisms."
    },
    {
     "t": "p",
     "text": "**Theme: Business Problem Framing**"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "291",
   "q": "The marketing team says \"we want to predict which customers will churn.\" Before building a model, what questions do you ask?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) How do you define churn? (no purchase in 30/60/90 days?), (2) what's the prediction window? (churn in next month?), (3) what actions will you take on predictions? (retention offers?), (4) what's the cost of intervention vs. cost of churn?, (5) what data is available and at what granularity?, (6) who are the stakeholders?, (7) what's currently done for retention?, (8) how will success be measured?, (9) any constraints (budget, timeline, regulatory)?"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "292",
   "q": "An executive says \"our data shows that customers who use feature X spend 3x more.\" They want to promote feature X to all users. Why might this be wrong?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Selection bias / confounding: (1) maybe high-spending customers naturally gravitate to feature X (reverse causation), (2) maybe a third factor (tech-savviness) drives both feature use AND spending, (3) promoting to everyone won't replicate the 3x because the non-users are different, (4) Need: A/B test randomly encouraging feature X adoption to measure causal effect, (5) even if causal, magnitude might be different for new adopters vs. natural adopters."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "293",
   "q": "Your company wants to use data science to \"reduce costs.\" This is too vague. How do you scope a project?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Identify specific cost centers: operations, customer acquisition, inventory, support, (2) quantify: \"which cost categories are largest and most variable?\", (3) prioritize by potential impact × feasibility, (4) define a specific, measurable objective: \"reduce call center volume by 15%\", (5) identify available data, (6) propose 2-3 candidate projects with expected ROI, (7) start with quick-win analytics before complex ML, (8) define success metrics and timeline for evaluation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "294",
   "q": "You built a churn model with 90% accuracy. The business says \"so what?\" They're not using it. What went wrong?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Model wasn't connected to business action: (1) no action plan for predicted churners, (2) predictions not integrated into existing workflows/tools, (3) no clear ROI communicated, (4) stakeholders weren't involved in development, (5) the output format/frequency doesn't match their needs. Fix: (1) prescriptive analytics: \"offer 20% discount to these 500 customers,\" (2) embed predictions in CRM tool, (3) calculate: \"intervening on top 500 saves $X/month,\" (4) create a feedback loop to show results."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "295",
   "q": "Your CEO asks \"can AI predict our stock price?\" How do you respond?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Honest response: (1) stock prices incorporate all available public information (efficient market hypothesis), (2) any signal that works becomes arbitraged away, (3) we can analyze factors that historically correlate with stock movement, (4) we can build sentiment analysis on news/social media for short-term indicators, (5) forecasting specific prices is unreliable — uncertainty increases rapidly, (6) better framing: \"we can model risk factors and scenario analysis,\" (7) set expectations: no model reliably beats the market long-term."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "296",
   "q": "You need to decide between building an ML solution vs. a simple rules-based system. What's your framework?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Use rules when: (1) rules are clear and few (\"if amount > $10K, flag for review\"), (2) data is scarce, (3) full explainability is required, (4) relationship is well-understood, (5) maintenance by non-ML team. Use ML when: (1) patterns are complex and non-obvious, (2) rules are too many to manually define (>20-30), (3) sufficient labeled data exists, (4) slight accuracy improvement has large business value, (5) patterns evolve over time. Often: start with rules, add ML when rules aren't enough."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "297",
   "q": "You're the first data scientist at a startup. There's no data infrastructure. How do you prioritize?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Month 1: audit what data exists, set up basic tracking/logging, (2) Month 2: build a data warehouse (simple: BigQuery + dbt), (3) Month 3: create key dashboards (KPIs, metrics), (4) Month 4-5: first analytics project — descriptive insights for biggest business question, (5) Month 6: first ML project — pick the highest-ROI, simplest problem. Key: resist pressure to \"do AI\" immediately — build foundation first. Quick wins with simple analytics build credibility."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "298",
   "q": "Two teams want different things from the same model: marketing wants high recall (catch all potential customers), sales wants high precision (only high-quality leads). How do you resolve?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Different operating points: marketing gets lower-threshold predictions (more leads, some noise), sales gets higher-threshold (fewer but qualified leads), (2) single model with two outputs: \"marketing-qualified leads\" and \"sales-qualified leads\" at different thresholds, (3) lead scoring with tiers: hot/warm/cold with different actions per tier, (4) demonstrate the precision-recall tradeoff visually — show them the actual numbers, (5) agree on shared success metric: revenue generated, not just leads."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "299",
   "q": "Your data science project keeps changing scope. Requirements from stakeholders shift weekly. How do you manage this?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Agile approach: 2-week sprints with defined deliverables, (2) project charter: document agreed scope, success criteria, timeline, (3) change request process: new requirements go to backlog, prioritized in next sprint, (4) stakeholder alignment: regular demos showing progress, (5) MVP approach: deliver minimum viable model first, iterate, (6) say no diplomatically: \"we can add this in phase 2,\" (7) track scope changes and their impact on timeline, (8) single point of contact from business side."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "300",
   "q": "You're asked to predict something but the target variable doesn't exist in your data. How do you create a proxy target?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** (1) Define the concept precisely: what does \"customer satisfaction\" mean in measurable terms?, (2) use behavioral proxies: satisfaction → repeat purchases + low return rate + positive reviews, (3) survey a sample and use as labels, then train model predicting survey responses from behavioral data, (4) composite score: combine multiple signals into one target, (5) validate the proxy: does it correlate with business outcomes?, (6) be transparent about limitations of the proxy, (7) continuously validate as ground truth data becomes available."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});

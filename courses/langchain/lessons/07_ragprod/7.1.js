EC.receiveLesson({
  id: "7.1",
  lede: "6.2 established that a retriever always returns `k` results and has no output meaning *no*. This lesson builds the thing that says no, and the measurement contains a correction to my own reasoning. I expected the **gap** between rank 1 and rank 2 to be the better signal \u2014 absolute cosine is not comparable across queries, so a within-query difference should be more robust. It is **much worse**: AUC **0.614** against the absolute score's **0.943**. A plausible mechanism is not evidence. And the populations overlap regardless, so a guard is a trade-off deliberately chosen, never a clean classifier.",
  objectives: [
    "Measure the score distributions of answerable and unanswerable queries",
    "Sweep a threshold and read both error rates at once",
    "Compare two candidate signals with a proper separation metric",
    "Explain why the rank-gap signal fails despite sound reasoning",
    "Say why a cross-encoder guard would refuse the wrong queries"
  ],
  prerequisites: ["6.2", "6.1"],
  blocks: [
    { t: "h2", n: "01", id: "populations", text: "The two populations", sub: "And they overlap" },

    { t: "code", lang: "text", title: "Top-1 cosine, answerable against unanswerable",
      code: "answerable  : min 0.2461  mean 0.4581  max 0.6431\nunanswerable: min 0.0764  mean 0.2187  max 0.3900\n\nthe worst answerable query scores 0.2461\nthe best unanswerable scores        0.3900",
      caption: "The ranges overlap, so no threshold separates them cleanly." },
    { t: "p", text: "The unanswerable set is five questions this corpus genuinely cannot answer \u2014 a question about a competitor's integration, a SOC 2 audit scope, paying in Bitcoin. Each one still returns a document, which is 6.2's point, and each one still returns it with a positive score." },
    { t: "h2", n: "02", id: "sweep", text: "The sweep", sub: "Both error rates, at every threshold" },
    { t: "code", lang: "text", title: "There is no row with zero of both",
      code: "threshold   answered   wrongly refused   wrongly answered\n0.00        14         0                 5\n0.15        14         0                 3\n0.25        13         1                 2\n0.30        13         1                 1\n0.35        11         3                 1\n0.40        10         4                 0",
      caption: "`0.40` eliminates wrong answers and refuses four questions it could have answered." },
    { t: "callout", kind: "tradeoff", title: "A guard is a chosen trade, not a classifier", body: [
      { t: "p", text: "Because the populations overlap, every threshold trades one error against the other. The only question is which error you prefer, and that is a product decision rather than a technical one." },
      { t: "p", text: "For a support bot, wrongly answering is usually worse \u2014 a confident wrong answer about a refund policy costs more than *\u201cI could not find that\u201d*. For an internal research tool the opposite often holds, because the user can judge a weak result and a refusal wastes their time. The threshold encodes that judgement, so it belongs with the people who own the consequence." }
    ] },
    { t: "h2", n: "03", id: "signals", text: "Two signals, compared properly", sub: "And I was wrong about which wins" },

    {"kind": "timeline", "title": "A correction to my own reasoning", "caption": "I expected the **gap** between rank 1 and rank 2 to be the signal — a confident retrieval should separate its winner. It is not. The plain absolute score separates answerable from unanswerable far better, and a plausible mechanism is not evidence.", "span": 1, "tick": 0.1, "unit": "AUC — answerable against unanswerable", "lanes": [{"label": "the rank 1-2 gap", "bars": [[0, 0.614, "0.614 — near chance", "crit"]]}, {"label": "the top score", "bars": [[0, 0.943, "0.943 — threshold on this", "good"]]}], "t": "diagram", "id": "dg-7_1-03-0"},


    { t: "code", lang: "text", title: "AUC \u2014 the probability an answerable query outscores an unanswerable one",
      code: "signal              answerable  unanswerable  AUC     overlapping pairs\nabsolute top-1      0.4581      0.2187        0.943   4 of 70\ntop1 - top2 gap     0.1140      0.0664        0.614   27 of 70",
      caption: "1.0 is perfect separation; 0.5 is a coin flip." },
    { t: "callout", kind: "insight", title: "The reasoning was sound and the conclusion was wrong", body: [
      { t: "p", text: "The case for the gap: 6.2 showed absolute cosine is not comparable across queries \u2014 a failed retrieval scored 0.4445 while a correct non-answer scored 0.1279 \u2014 so a **within-query** difference ought to be more robust. That argument is correct as far as it goes." },
      { t: "p", text: "The data refuses it. The answerable gaps start at **0.0110**, *below* the smallest unanswerable gap of 0.0228. The reason is visible once you look: a query whose two best documents are **both relevant** has a tiny gap and is perfectly answerable. So a small gap means either *\u201cnothing matched\u201d* or *\u201cseveral things matched\u201d*, and the guard cannot tell those apart." },
      { t: "p", text: "A plausible mechanism is not evidence. Both signals were worth measuring and only one survives \u2014 which is the general reason to measure a guard rather than reason about it." }
    ] },
    { t: "h2", n: "04", id: "crossencoder", text: "The cross-encoder as a second opinion", sub: "And which queries it would refuse" },
    { t: "code", lang: "text", title: "Scoring each query against its own top-1 document",
      code: "answerable mean  -6.737\nunanswerable mean -10.333\n\nworst answerable : -11.014   'I forgot my password'\nbest unanswerable:  -8.950   'how do I integrate with Salesforce'",
      caption: "The worst answerable query scores below **every** unanswerable one." },
    { t: "callout", kind: "warn", title: "It would refuse exactly the queries dense answers correctly", body: [
      { t: "p", text: "`I forgot my password` scores \u221211.014 \u2014 lower than all five unanswerable queries. That is 6.7's demotion appearing again: the cross-encoder penalises the vocabulary-mismatch class, because the relevant document says *\u201ccredential recovery \u2026 signed recovery link\u201d* and the query does not." },
      { t: "p", text: "So a cross-encoder guard would refuse precisely the queries dense retrieval handles correctly. It is still worth considering as **one** input, because it is a second model and its errors are not perfectly correlated with the retriever's \u2014 but it cannot be the guard on its own, and an ensemble of two models that fail on the same query class is not an ensemble." }
    ] },
    { t: "h2", n: "05", id: "other", text: "What else the guard should use", sub: "Since no single signal is enough" },
    { t: "dl", items: [
      ["the model's licence to abstain", "5.7's `say you do not know` instruction. Unenforced, and it is the only mechanism that sees the context rather than a score."],
      ["citation verification", "5.7 and 7.4: if the answer cites no document, or cites one that was not retrieved, that is detectable with a regex and is a strong signal the model had nothing to work with."],
      ["the retrieval score, at a conservative threshold", "AUC 0.943 is good enough to be useful and not good enough to be alone."]
    ] },
    { t: "p", text: "Layering these is not the same as having a reliable guard \u2014 it is accepting that each individual signal is weak and that their failures are partly independent. The honest framing is that abstention is a risk-management problem, not a solved one." },
    { t: "exercise", kind: "build", title: "Build a guard and measure what it costs",
      difficulty: "core", minutes: 30,
      body: "Assemble a set of queries the corpus genuinely cannot answer alongside the labelled answerable ones. Measure the top-1 similarity distribution of each population and report whether they overlap. Sweep a threshold and report both error rates at every setting. Then compare the absolute score against the rank-1 minus rank-2 gap using a proper separation metric, and say which wins. Finally test a cross-encoder as the guard signal and identify which queries it would wrongly refuse.",
      requirements: ["Build an unanswerable query set and measure both score distributions",
        "State whether the ranges overlap, with the two boundary values",
        "Sweep a threshold reporting wrongly-refused and wrongly-answered at each",
        "Compare two candidate signals with AUC or an equivalent separation metric",
        "Explain why the weaker signal failed despite a sound rationale",
        "Test a cross-encoder guard and name the query class it would refuse"],
      hint: "Measure the gap signal even though the absolute score is the obvious choice. One of the two is much worse than its reasoning suggests.",
      solution: { lang: "python", title: "x0701.py \u2014 AUC 0.943 against 0.614",
        code: 'UNANSWERABLE = ["what is the airspeed velocity of an unladen swallow",\n                "who won the world cup in 1998",\n                "how do I integrate with Salesforce",\n                "what is your SOC 2 audit scope",\n                "can I pay in Bitcoin"]\n\ndef auc(pos, neg):\n    """P(a random answerable scores above a random unanswerable)."""\n    w = 0.0\n    for a in pos:\n        for b in neg:\n            w += 1.0 if a > b else (0.5 if a == b else 0.0)\n    return w / (len(pos) * len(neg))\n\nans = [dense_scored(q, 1)[0][1] for q, _ in QUERIES]\nuna = [dense_scored(q, 1)[0][1] for q in UNANSWERABLE]\nagap = [dense_scored(q, 2)[0][1] - dense_scored(q, 2)[1][1] for q, _ in QUERIES]\nugap = [dense_scored(q, 2)[0][1] - dense_scored(q, 2)[1][1] for q in UNANSWERABLE]\n\nprint("absolute: %.3f" % auc(ans, una))\nprint("gap     : %.3f" % auc(agap, ugap))',
        out: "==============================================================================\nPART 1 -- the two populations a threshold has to separate\n==============================================================================\n  answerable queries (relevant doc exists), top-1 cosine:\n    0.4328  \"I can't log in, it says my account is locked\"\n    0.3064  'I forgot my password'\n    0.4404  'how long before I get signed out'\n    0.4846  'stop my plan renewing'\n    0.6027  'I ordered the wrong thing and want to stop it'\n    0.5975  'when do I get my money back'\n    0.3960  'what if I use more than I paid for'\n    0.4630  'how many calls can I make before being throttled'\n    0.6431  'what happens to a webhook that keeps failing'\n    0.6328  'how do I make retrying a write safe'\n    0.4429  'how long do you keep my information'\n    0.3236  'let a colleague into my account'\n    0.4013  'send alerts to chat'\n    0.2461  'is there a page showing if you are down'\n\n  unanswerable queries, top-1 cosine:\n    0.1279  api-limits           'what is the airspeed velocity of an unl\n    0.0764  user-invite          'who won the world cup in 1998'\n    0.2132  intg-oauth           'how do I integrate with Salesforce'\n    0.3900  data-audit           'what is your SOC 2 audit scope'\n    0.2862  bill-payment-method  'can I pay in Bitcoin'\n\n  answerable  : min 0.2461  mean 0.4581  max 0.6431\n  unanswerable: min 0.0764  mean 0.2187  max 0.3900\n\n  the ranges OVERLAP: the worst answerable query scores 0.2461 and the\n  best unanswerable scores 0.3900.\n  so no threshold separates them cleanly.\n==============================================================================\nPART 2 -- the trade-off, swept\n==============================================================================\n  threshold   answered   wrongly refused   wrongly answered\n  0.00        14         0                 5\n  0.10        14         0                 4\n  0.15        14         0                 3\n  0.20        14         0                 3\n  0.25        13         1                 2\n  0.30        13         1                 1\n  0.35        11         3                 1\n  0.40        10         4                 0\n\n  every row trades one error against the other. there is no setting\n  with zero of both unless the populations separate -- which they\n  do not.\n==============================================================================\nPART 3 -- a better signal: the gap between rank 1 and rank 2\n==============================================================================\n  a similarity score is not comparable across queries (6.2), but the\n  SEPARATION within one query's results is.\n\n  answerable queries, top1 - top2:\n    min 0.0110  mean 0.1140  max 0.3110\n  unanswerable queries, top1 - top2:\n    min 0.0228  mean 0.0664  max 0.1258\n\n\n  comparing the two candidate signals properly. AUC here is the\n  probability that a random answerable query outscores a random\n  unanswerable one -- 1.0 is perfect separation, 0.5 is useless.\n\n  signal              answerable  unanswerable  AUC     overlapping pairs\n  absolute top-1      0.4581      0.2187        0.943   4 of 70\n  top1 - top2 gap     0.1140      0.0664        0.614   27 of 70\n\n  the gap is the WORSE signal, which is not what I expected. the\n  reasoning for it was sound -- absolute scores are not comparable\n  across queries (6.2) and a within-query difference should be -- and\n  the measurement does not support it.\n\n  the reason is visible in the ranges: the answerable gaps start at\n  0.0110, BELOW the smallest unanswerable gap of 0.0228. a query whose\n  two best documents are both relevant has a tiny gap and is\n  perfectly answerable -- so a small gap means either 'nothing\n  matched' or 'several things matched', and the guard cannot tell\n  those apart.\n\n  which is a reminder that a plausible mechanism is not evidence.\n  both signals were worth measuring and only one of them survives.\n==============================================================================\nPART 4 -- the cross-encoder as a second opinion\n==============================================================================\n  scoring each query against its own top-1 document:\n\n  answerable:\n      -8.706  auth-signin-fail     \"I can't log in, it says my account is l\n     -11.014  auth-reset           'I forgot my password'\n     -10.242  auth-session         'how long before I get signed out'\n      -0.205  bill-cancel-sub      'stop my plan renewing'\n      -5.802  bill-cancel-order    'I ordered the wrong thing and want to s\n      -4.455  bill-refund          'when do I get my money back'\n  unanswerable:\n     -11.376  api-limits           'what is the airspeed velocity of an unl\n     -11.031  user-invite          'who won the world cup in 1998'\n      -8.950  intg-oauth           'how do I integrate with Salesforce'\n      -9.328  data-audit           'what is your SOC 2 audit scope'\n     -10.978  bill-payment-method  'can I pay in Bitcoin'\n\n  answerable mean -6.737, unanswerable mean -10.333\n  overlap: worst answerable -11.014 vs best unanswerable -8.950\n\n  AUC for the cross-encoder signal: 0.833\n\n  it overlaps too -- and note WHICH answerable query scores worst:\n  'I forgot my password' at -11.014, below every unanswerable query.\n  that is 6.7's demotion again. the cross-encoder penalises the\n  vocabulary-mismatch class, so as a guard it would refuse exactly\n  the queries dense retrieval answers correctly.\n\n  6.1 warned these are logits and not comparable across queries. that\n  is exactly the problem here too -- but a cross-encoder is a SECOND\n  model, so its errors are not perfectly correlated with the\n  retriever's, which is the real argument for using it as a guard.",
        notes: [
          { t: "p", text: "**The populations overlap**: the worst answerable query scores 0.2461 and the best unanswerable scores 0.3900. So no threshold separates them, and every setting trades one error against the other." },
          { t: "p", text: "**A guard is a chosen trade, not a classifier.** Which error you prefer is a product decision \u2014 wrongly answering is usually worse for a support bot and often better for an internal research tool." },
          { t: "p", text: "**The absolute score wins decisively: AUC 0.943 against the gap's 0.614**, with 4 overlapping pairs of 70 against 27." },
          { t: "p", text: "**Which is not what I expected.** The case for the gap was sound \u2014 absolute scores are not comparable across queries (6.2) so a within-query difference should be more robust." },
          { t: "p", text: "**The data refuses it**: answerable gaps start at 0.0110, below the smallest unanswerable gap of 0.0228. A query whose two best documents are BOTH relevant has a tiny gap and is perfectly answerable, so a small gap means either \u2018nothing matched\u2019 or \u2018several things matched\u2019." },
          { t: "p", text: "**A plausible mechanism is not evidence.** Both signals were worth measuring and only one survived." },
          { t: "p", text: "**A cross-encoder guard would refuse the wrong queries**: `I forgot my password` scores -11.014, below every unanswerable query \u2014 6.7's demotion again. Two models that fail on the same query class are not an ensemble." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the guard that was tuned on the hit rate", body: [
      { t: "p", text: "A team adds a score threshold and tunes it to maximise the proportion of questions answered, because refusals generate complaints. They settle just above zero. Refusal complaints stop and the system never abstains." },
      { t: "p", text: "That objective has one optimum, and it is to switch the guard off. Any threshold low enough to answer everything answers the unanswerable queries too \u2014 at 0.00 this corpus wrongly answers all five, with a confident citation each time." },
      { t: "p", text: "The structural fix is to tune against the error you actually fear, and to measure both rates together so the trade is visible. The reason this goes wrong so reliably is that one error generates complaints and the other does not: a user who is refused writes in, and a user who receives a confident wrong answer about a refund policy believes it. Optimising the metric that generates feedback optimises against the metric that matters." }
    ] }
  ],
  takeaways: [
    "**A retriever has no output meaning no**, so abstention must be added as a separate decision.",
    "**The answerable and unanswerable score populations overlap** \u2014 0.2461 against 0.3900 at the boundary.",
    "**So every threshold trades wrongly-refused against wrongly-answered**; there is no row with zero of both.",
    "**A guard is a chosen trade, not a classifier**, and which error you prefer is a product decision.",
    "**The absolute top-1 score separates at AUC 0.943**; the rank-gap signal only reaches 0.614.",
    "**Which contradicted my expectation** \u2014 the gap's rationale was sound and the data refused it.",
    "**Answerable gaps start at 0.0110, below the smallest unanswerable gap**: a query with two relevant documents has a tiny gap.",
    "**So a small gap means either \u2018nothing matched\u2019 or \u2018several things matched\u2019**, which the guard cannot distinguish.",
    "**A plausible mechanism is not evidence** \u2014 measure a guard rather than reasoning about it.",
    "**A cross-encoder guard would refuse the vocabulary-mismatch class** that dense answers correctly.",
    "**Two models failing on the same query class are not an ensemble.**",
    "**Layer the score, the model's licence to abstain, and citation verification** \u2014 each is weak and their failures are partly independent.",
    "**Never tune a guard on the proportion answered** \u2014 that objective's optimum is to switch the guard off."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Why is the rank-1 minus rank-2 gap a worse abstention signal than the absolute score?",
      options: ["It is noisier because it involves two measurements",
        "A query whose two best documents are both relevant has a tiny gap, so a small gap means either nothing matched or several things matched",
        "The gap is not comparable across queries",
        "It requires fetching more candidates"],
      answer: 1,
      why: "The answerable gaps measured as low as 0.0110, below the smallest unanswerable gap of 0.0228, because a question with two genuinely relevant documents produces two high and similar scores. The signal conflates the best case with the worst case, which is why its AUC was 0.614 against the absolute score's 0.943 \u2014 despite the sound-sounding argument that a within-query difference should be more robust." },
    { stem: "A threshold of 0.40 produced zero wrong answers and four wrongly refused questions. What does that represent?",
      options: ["A badly tuned threshold that needs lowering",
        "One end of a trade-off that has no setting with zero of both errors",
        "Evidence the guard signal is unusable",
        "The correct setting for any production system"],
      answer: 1,
      why: "Because the two score populations overlap, eliminating one error necessarily incurs the other. Which end to sit at depends on the cost of each: a support bot usually prefers refusing to answering wrongly, while an internal research tool often prefers the opposite because its users can judge a weak result. The threshold encodes a product judgement, not a technical optimum." },
    { stem: "Why would a cross-encoder be a poor sole guard here?",
      options: ["Its scores are logits rather than probabilities",
        "It scored a correctly answered vocabulary-mismatch query below every unanswerable query, so it would refuse what the retriever gets right",
        "It is too slow to run per query",
        "It cannot score a query against multiple documents"],
      answer: 1,
      why: "The query 'I forgot my password' scored \u221211.014 against an unanswerable best of \u22128.950, which is 6.7's demotion appearing in a new place \u2014 the cross-encoder reads the same vocabulary mismatch dense did. It may still be worth including as one input, since it is a second model with partly independent errors, but two models that fail on the same query class do not form a useful ensemble." },
    { stem: "A team tunes the guard threshold to maximise the proportion of questions answered. What happens?",
      options: ["It converges on a well-balanced threshold",
        "That objective's optimum is to disable the guard, because any threshold low enough to answer everything also answers the unanswerable queries",
        "It overfits to the evaluation set",
        "It produces too many refusals on rare queries"],
      answer: 1,
      why: "Maximising answers has a single global optimum at a threshold of zero, which answers all five unanswerable queries with confident citations. The reason this error is common is that one failure generates feedback and the other does not \u2014 a refused user complains, while a user given a confident wrong answer believes it. Optimising the observable metric optimises against the one that matters." }
  ] },
  interview: { title: "Interview practice", sub: "Abstention", questions: [
    { level: "core", q: "How would you make a RAG system say it does not know?",
      strong: "A strong answer layers weak signals and knows none is reliable alone.",
      answer: [
        { t: "p", text: "By layering several weak signals, because I measured each one individually and none is good enough alone." },
        { t: "p", text: "The retrieval score is the usable one. I built a set of questions my corpus genuinely could not answer and compared the top-1 cosine distributions: answerable averaged 0.46 and unanswerable 0.22, with an AUC of 0.943. Good enough to be worth having." },
        { t: "p", text: "But the populations overlap \u2014 the worst answerable query scored 0.2461 and the best unanswerable 0.3900 \u2014 so there is no threshold with zero of both errors. A guard is a trade you choose, not a classifier. I would set it from the cost of a wrong answer rather than from the hit rate, and I would put that decision with whoever owns the consequence." },
        { t: "p", text: "On top of the score I would use the model's own licence to abstain, which is the only mechanism that sees the context rather than a number, and citation verification \u2014 if the answer cites nothing, or cites an id that was never retrieved, that is a regex away and a strong signal the model had nothing to work with." }
      ] },
    { level: "advanced", q: "Tell me about a time a measurement contradicted your reasoning.",
      strong: "A strong answer has a specific case and the mechanism behind the surprise.",
      answer: [
        { t: "p", text: "Building that guard. I expected the gap between the top two results to beat the absolute score, and it was much worse \u2014 AUC 0.614 against 0.943." },
        { t: "p", text: "My reasoning was that absolute similarity is not comparable across queries. I had measured a failed retrieval at 0.44 and a correct non-answer at 0.13, so the absolute number is genuinely unreliable, and a within-query difference should sidestep that. That argument is correct as far as it goes." },
        { t: "p", text: "What it missed is that a small gap is ambiguous. The answerable gaps went as low as 0.0110, below the smallest unanswerable gap, because a question whose two best documents are both relevant produces two high, similar scores. So a tiny gap means either nothing matched or several things matched, and the guard cannot distinguish those \u2014 it is conflating the best case with the worst case." },
        { t: "p", text: "The lesson I took is that a plausible mechanism is not evidence. Both signals were worth measuring and it cost about twenty lines to find out which survives. I would be wary of any guard designed from first principles without that check, including one I had designed myself." }
      ] },
    { level: "core", q: "Where should the abstention threshold be set, and who decides?",
      strong: "A strong answer makes it a product decision with the data visible.",
      answer: [
        { t: "p", text: "Whoever owns the consequence decides, and my job is to put both error rates in front of them at every candidate setting." },
        { t: "p", text: "Because the two score populations overlap, there is no threshold with zero of both errors. On the sweep I measured, 0.30 gave one wrongly refused and one wrongly answered; 0.40 eliminated wrong answers at the cost of refusing four questions it could have answered. That is the whole decision, and it is not technical." },
        { t: "p", text: "For a customer-facing support bot I would argue for the conservative end. A confident wrong answer about a refund policy or a data retention period is a specific false statement the user will act on, and it costs more than a refusal they can escalate." },
        { t: "p", text: "For an internal research tool I would argue the opposite, because the user can judge a weak result in seconds and a refusal just wastes their time." },
        { t: "p", text: "What I would push back on hard is tuning it on the proportion of questions answered. That objective's optimum is to switch the guard off, and it is seductive because refusals generate complaints while confident wrong answers do not." }
      ] }
  ] }
});

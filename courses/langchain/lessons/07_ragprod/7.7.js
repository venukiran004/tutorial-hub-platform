EC.receiveLesson({
  id: "7.7",
  lede: "A semantic cache is a threshold on paraphrase similarity, and both of its failure modes are reachable with completely ordinary queries. *\u201cis retention 30 days\u201d* against *\u201cis retention 90 days\u201d* scores **0.8762** \u2014 two questions with different answers, differing in one token that decides everything. Meanwhile *\u201cwhere is my money\u201d* against *\u201cwhen do I get a refund\u201d* scores **0.2404** \u2014 the same request, in words that share nothing. An embedding encodes topic, so it compresses away exactly the difference that matters and fails to see exactly the equivalence that matters. There is no threshold with zero of both errors, and the two errors are not comparable: a miss costs latency, a wrong hit tells a user something false.",
  objectives: [
    "Measure both failure modes of a similarity threshold",
    "Explain why each one happens in terms of what an embedding encodes",
    "Sweep a threshold and report both error rates together",
    "Justify a threshold from the cost of a wrong answer",
    "Identify the caches that carry no semantic risk"
  ],
  prerequisites: ["5.4", "6.1"],
  blocks: [
    { t: "h2", n: "01", id: "both", text: "Both failure modes, measured", sub: "And they pull the threshold apart" },

    {"kind": "matrix", "title": "Both failure modes are reachable with ordinary queries", "caption": "A semantic cache is a threshold on paraphrase similarity. *“is retention 30 days”* against *“is retention 90 days”* scores **0.8762** — two questions with different answers, above most thresholds. There is no setting that separates these.", "cols": ["similarity", "same answer?", "what a threshold does"], "rows": ["30 days vs 90 days", "a true paraphrase"], "cells": [[{"text": "0.8762", "tone": "crit"}, {"text": "NO", "tone": "crit"}, {"text": "serves the wrong one", "tone": "crit"}], [{"text": "similar range", "tone": "warn"}, {"text": "yes", "tone": "good"}, {"text": "a correct hit", "tone": "good"}]], "t": "diagram", "id": "dg-7_7-01-0"},




    { t: "code", lang: "text", title: "Different questions that score high",
      code: "0.8762   is retention 30 days               | is retention 90 days\n0.8703   how do I cancel my annual plan     | how do I cancel my monthly plan\n0.8304   can I store data in the EU region  | can I store data in the US region",
      caption: "Each differs in a single token that decides the whole answer." },
    { t: "code", lang: "text", title: "Same questions that score low",
      code: "0.2404   where is my money         | when do I get a refund\n0.3572   my card was declined      | payment failed\n0.4214   stop charging me          | cancel my subscription\n0.4750   too many requests error   | rate limit exceeded",
      caption: "The same request, in words that share nothing." },
    { t: "callout", kind: "insight", title: "An embedding encodes topic", body: [
      { t: "p", text: "The high-scoring different pairs have **identical topics** \u2014 retention, cancellation, data residency \u2014 and the decisive difference is a number or a region name, which is precisely what the vector compresses away. 30 and 90 are both quantities in the same slot of the same sentence." },
      { t: "p", text: "The low-scoring same pairs are 5.4's vocabulary mismatch: *\u201cstop charging me\u201d* and *\u201ccancel my subscription\u201d* are the same request and are not similar strings. So the cache fails in exactly the two ways 5.4 predicted, and they pull the threshold in opposite directions." }
    ] },
    { t: "h2", n: "02", id: "sweep", text: "The sweep", sub: "Both error rates at once" },
    { t: "code", lang: "text", title: "Eight paraphrase pairs against eight near-misses",
      code: "threshold   hits   correct   WRONG served   genuine repeats MISSED\n0.40        14     6         8              2\n0.50        12     4         8              4\n0.60        11     3         8              5\n0.70        6      3         3              5\n0.80        6      3         3              5\n0.85        5      3         2              5\n0.90        3      3         0              5\n0.95        2      2         0              6\n\nAUC of similarity as a paraphrase classifier: 0.375",
      caption: "No row has zero of both." },
    { t: "callout", kind: "warn", title: "The caveat on that AUC", body: [
      { t: "p", text: "I chose both populations **adversarially** \u2014 hard paraphrases that share no vocabulary, and near-misses differing in one decisive token. So 0.375 is not an estimate of how a semantic cache performs on real traffic, where most repeats are easy paraphrases and the figure would be far higher." },
      { t: "p", text: "What the number does establish is that both failure modes are reachable with entirely ordinary queries. *\u201cIs retention 30 days\u201d* against *\u201cis retention 90 days\u201d* is not a contrived example \u2014 it is a question a user asks, and it scores 0.8762." }
    ] },
    { t: "p", text: "Read the sweep for its usable row rather than its summary statistic: at **0.90** the cache serves zero wrong answers and misses five of eight genuine repeats. A high threshold and a low hit rate is the correct operating point when one of your two errors is telling a user something false." },
    { t: "h2", n: "03", id: "asymmetry", text: "The two errors are not comparable", sub: "Which decides how to tune" },
    { t: "dl", items: [
      ["a miss", "Costs latency. You do the work you would have done anyway, and the user gets a correct answer slightly later."],
      ["a wrong hit", "Serves a confidently wrong answer to a different question, **with a citation**, and the user has no way to tell."]
    ] },
    { t: "p", text: "*\u201cIs retention 30 days\u201d* answered from the cache entry for *\u201cis retention 90 days\u201d* is not a degraded answer. It is a specific false statement about a data policy, delivered with a citation to a real document, to a user who asked a precise question." },
    { t: "callout", kind: "trap", title: "Hit rate is the easy metric and the wrong objective", body: [
      { t: "p", text: "Hit rate is trivial to measure and improves monotonically as you lower the threshold, so tuning for it drives you to the bottom of that sweep \u2014 where eight of fourteen hits are wrong." },
      { t: "p", text: "This is 7.1's guard problem again: one error generates feedback and the other does not. A user who waits complains about latency; a user who receives a confident wrong answer believes it. Optimising the observable metric optimises against the one that matters." }
    ] },
    { t: "h2", n: "04", id: "safe", text: "The caches that carry no risk", sub: "And they are the ones people skip" },
    { t: "table", head: ["layer", "key", "risk if wrong", "saves"], rows: [
      ["query embedding", "**exact** query text", "none \u2014 deterministic", "~104 ms"],
      ["retrieval result", "**exact** query text", "stale documents only", "~105 ms"],
      ["reranker scores", "**(query, doc)** pair", "stale documents only", "~1362 ms"],
      ["final answer", "query **embedding**", "**a wrong answer**", "everything"]
    ] },
    { t: "callout", kind: "insight", title: "The reranker-score cache is the underused one", body: [
      { t: "p", text: "6.1 measured query encoding at ~104 ms against a vector search of 0.08 ms \u2014 so most of a dense query's latency is embedding the query string, and caching that on exact text is free and always correct." },
      { t: "p", text: "The reranker cache is better still. A cross-encoder scores a `(query, document)` pair, and that score cannot change unless the document does \u2014 so it is as safe as an embedding cache while protecting the most expensive stage in the pipeline, which 6.1 measured at 68 ms per pair. The answer cache is the one everybody builds, and it is the only one that can tell a user something false." }
    ] },
    { t: "h2", n: "05", id: "stale", text: "And if you do cache answers", sub: "The expiry nobody designs for" },
    { t: "p", text: "A cached answer was grounded in documents that can change (7.5), so it has **two** expiry conditions: time, which everyone implements, and **source change** \u2014 any cited document was edited or deleted \u2014 which almost nobody does." },
    { t: "callout", kind: "mental", title: "5.7's citation requirement, collecting a third time", body: [
      { t: "p", text: "Store the cited document ids with the cache entry, and a document update invalidates exactly the entries that depended on it. That is the whole implementation, and it is only possible because the answer was required to cite its sources." },
      { t: "p", text: "Without it, a nightly rebuild corrects the corpus and the cache keeps serving the old answer \u2014 so the correction is invisible to every user who asks a cached question, which is the population most likely to ask it. 7.4 used citations for grounding and 7.6 as an injection signal; this is the third use of the same field." }
    ] },
    { t: "exercise", kind: "analysis", title: "Measure a semantic cache's two errors",
      difficulty: "core", minutes: 28,
      body: "Build two populations: paraphrase pairs that should hit the cache, and near-miss pairs that must not. Make both adversarial \u2014 paraphrases sharing no vocabulary, and different questions differing in one decisive token. Measure the similarity of each pair and report whether the ranges overlap. Sweep a threshold and report both error rates together. Then explain why the two errors are not comparable, and tabulate the caches that carry no semantic risk.",
      requirements: ["Build adversarial paraphrase and near-miss populations",
        "Measure both and report whether the ranges overlap",
        "Explain each failure mode in terms of what an embedding encodes",
        "Sweep a threshold reporting wrong answers served and genuine repeats missed",
        "Caveat any summary statistic given adversarial sampling",
        "Explain why a miss and a wrong hit are not comparable errors",
        "Tabulate cache layers by key and by semantic risk"],
      hint: "For the near-misses, change one number or one place name and leave the rest of the sentence identical. Those are the pairs a cache gets wrong.",
      solution: { lang: "python", title: "x0707.py \u2014 0.8762 for two different answers",
        code: 'SAME = [("stop charging me", "cancel my subscription"),\n        ("where is my money", "when do I get a refund"),\n        ("too many requests error", "rate limit exceeded")]\nDIFF = [("is retention 30 days", "is retention 90 days"),\n        ("how do I cancel my annual plan", "how do I cancel my monthly plan"),\n        ("can I store data in the EU region", "can I store data in the US region")]\n\ndef cos(a, b):\n    e = ENC.encode([a, b], normalize_embeddings=True)\n    return float(e[0] @ e[1])\n\nsame = [cos(a, b) for a, b in SAME]\ndiff = [cos(a, b) for a, b in DIFF]\n\nfor t in (0.40, 0.70, 0.85, 0.90, 0.95):\n    print("%.2f  wrong served %d  repeats missed %d"\n          % (t, sum(1 for s in diff if s >= t),\n             len(same) - sum(1 for s in same if s >= t)))',
        out: "==============================================================================\nPART 1 -- a semantic cache is a threshold on paraphrase similarity\n==============================================================================\n  a hit means: this question is close enough to one we answered, so\n  serve the stored answer. the threshold decides 'close enough'.\n\n  SAME question, different words -- these SHOULD hit:\n    0.9915   how do I reset my password         | how can I reset my password\n    0.9399   how do I reset my password         | I need to reset my password\n    0.9731   cancel my subscription             | cancel my subscriptions\n    0.3572   my card was declined               | payment failed\n    0.4214   stop charging me                   | cancel my subscription\n    0.2404   where is my money                  | when do I get a refund\n    0.4750   too many requests error            | rate limit exceeded\n    0.5205   I can't get in                     | login problem\n\n  DIFFERENT question, different answer -- these MUST NOT hit:\n    0.8762   is retention 30 days               | is retention 90 days\n    0.8703   how do I cancel my annual plan     | how do I cancel my monthly plan\n    0.8304   can I store data in the EU region  | can I store data in the US region\n    0.6544   what is the rate limit on the Grow | what is the rate limit on the Star\n    0.6397   how many seats does the Growth pla | how many seats does the Starter pl\n    0.6616   how do I add a user to my account  | how do I remove a user from my acc\n    0.6627   how do I cancel my subscription    | how do I cancel my trial\n    0.6743   how do I cancel an order           | how do I return an order\n\n  same      : min 0.2404  mean 0.6149  max 0.9915\n  different : min 0.6397  mean 0.7337  max 0.8762\n\n  the ranges overlap heavily, and in BOTH directions:\n    3 different-question pairs score above 0.82\n    4 same-question pairs score below 0.50\n  so there is no threshold anywhere that is right.\n==============================================================================\nPART 2 -- the two failures, and why each one happens\n==============================================================================\n  the highest-scoring DIFFERENT pairs:\n    0.8762   is retention 30 days\n             is retention 90 days\n    0.8703   how do I cancel my annual plan\n             how do I cancel my monthly plan\n    0.8304   can I store data in the EU region\n             can I store data in the US region\n\n  every one differs in a single token that decides the whole answer --\n  30 vs 90, annual vs monthly, EU vs US. an embedding encodes topic,\n  and these pairs have identical topics. the decisive difference is\n  exactly what the embedding compresses away.\n\n  the lowest-scoring SAME pairs:\n    0.3572   my card was declined           | payment failed\n    0.4214   stop charging me               | cancel my subscription\n    0.2404   where is my money              | when do I get a refund\n    0.4750   too many requests error        | rate limit exceeded\n\n  these share almost no vocabulary. that is 5.4's mismatch again:\n  'stop charging me' and 'cancel my subscription' are the same request\n  and are not similar strings.\n\n  so a semantic cache fails in precisely the two ways 5.4 predicted,\n  and they pull the threshold in opposite directions.\n==============================================================================\nPART 3 -- the sweep -- and both error rates at once\n==============================================================================\n  threshold   hits   correct   WRONG served   genuine repeats MISSED\n  0.40        14     6         8              2\n  0.50        12     4         8              4\n  0.60        11     3         8              5\n  0.70        6      3         3              5\n  0.80        6      3         3              5\n  0.85        5      3         2              5\n  0.90        3      3         0              5\n  0.95        2      2         0              6\n\n  AUC of similarity as a paraphrase classifier: 0.375\n  (1.0 would be perfect separation; 0.5 is a coin flip)\n\n  at 0.85 the cache serves 2 wrong answers and misses 5 genuine\n  repeats. at 0.50 it serves 8 wrong and misses 4.\n\n  AN IMPORTANT CAVEAT about that AUC. I chose both populations\n  adversarially -- hard paraphrases that share no vocabulary, and\n  near-misses differing in one decisive token. so 0.375 is NOT an\n  estimate of how a semantic cache performs on real traffic, where\n  most repeats are easy paraphrases and the AUC would be far higher.\n\n  what the number does establish is that both failure modes are\n  reachable with entirely ordinary queries. 'is retention 30 days'\n  against 'is retention 90 days' is not a contrived example -- it is\n  a question a user asks, and it scores 0.8762.\n\n  so the usable conclusion from the sweep is the 0.90 row: zero wrong\n  answers, at the cost of missing 5 of 8 genuine repeats. a high\n  threshold and a low hit rate is the correct operating point when one\n  of your two errors is telling a user something false.\n==============================================================================\nPART 4 -- the two errors are not comparable\n==============================================================================\n  a MISS costs latency -- you do the work you would have done anyway.\n  a WRONG HIT serves a confidently wrong answer to a different\n  question, with a citation, and the user has no way to tell.\n\n  'is retention 30 days' answered from the cache entry for\n  'is retention 90 days' is not a degraded answer. it is a specific\n  false statement about a data policy, delivered with a citation to a\n  real document, to a user who asked a precise question.\n\n  so the threshold must be set from the cost of the wrong answer, and\n  that inverts the usual tuning instinct -- hit rate is the easy\n  metric and it is the wrong objective. a cache tuned for hit rate\n  will sit near the bottom of that sweep.\n==============================================================================\nPART 5 -- which is why the useful cache is not the answer cache\n==============================================================================\n  6.1 measured query encoding at ~104 ms and the whole vector search\n  at 0.08 ms. so most of a dense query's latency is embedding the\n  query string.\n\n  layer             key                risk if wrong        saves\n  query embedding   EXACT query text   none, deterministic  ~104 ms\n  retrieval result  EXACT query text   stale docs only      ~105 ms\n  reranker scores   (query, doc) pair  stale docs only      ~1362 ms\n  final answer      query EMBEDDING    a WRONG ANSWER       everything\n\n  the first three are keyed on exact text or an exact pair, so they\n  carry no semantic risk at all -- the same string embeds to the same\n  vector, and a cross-encoder's score for a given pair does not change\n  unless the document does.\n\n  the reranker-score cache is the underused one: it protects the most\n  expensive stage in the pipeline and is as safe as an embedding cache.\n  the answer cache is the one everybody builds, and it is the only one\n  that can tell a user something false.\n==============================================================================\nPART 6 -- and if you do cache answers, the staleness nobody designs for\n==============================================================================\n  a cached answer was grounded in documents that can change (7.5).\n  so it has two expiry conditions:\n    1. time -- the usual TTL\n    2. SOURCE CHANGE -- any cited document was edited or deleted\n\n  the second is the one that gets missed, and 5.7's citation\n  requirement is what makes it implementable: store the cited ids with\n  the entry, and a document update invalidates exactly the entries\n  that depended on it.\n\n  without that, a nightly rebuild corrects the corpus and the cache\n  keeps serving the old answer -- so the correction is invisible to\n  every user who asks a cached question, which is the population most\n  likely to ask it.",
        notes: [
          { t: "p", text: "**Both failure modes are reachable with ordinary queries.** \u2018Is retention 30 days\u2019 against \u2018is retention 90 days\u2019 scores 0.8762 \u2014 different answers, one decisive token apart." },
          { t: "p", text: "**And genuine paraphrases score as low as 0.2404** (\u2018where is my money\u2019 against \u2018when do I get a refund\u2019) \u2014 the same request in words that share nothing." },
          { t: "p", text: "**An embedding encodes topic**, so it compresses away the difference that matters (30 against 90) and cannot see the equivalence that matters. The cache fails in exactly the two ways 5.4 predicted, and they pull the threshold apart." },
          { t: "p", text: "**No threshold has zero of both errors.** At 0.85 the cache serves 2 wrong answers and misses 5 of 8 repeats; at 0.50 it serves 8 wrong and misses 4." },
          { t: "p", text: "**The AUC of 0.375 comes with a caveat**: I chose both populations adversarially, so it is not an estimate of real-world performance \u2014 it establishes that both failures are reachable, not how often they occur." },
          { t: "p", text: "**The usable row is 0.90**: zero wrong answers, five of eight repeats missed. A high threshold and a low hit rate is correct when one error tells a user something false." },
          { t: "p", text: "**A miss costs latency; a wrong hit serves a false statement with a citation.** So tune from the cost of the wrong answer \u2014 hit rate is the easy metric and the wrong objective, and its optimum is the bottom of the sweep." },
          { t: "p", text: "**The safe caches are keyed on exact text or an exact pair**: query embeddings (~104 ms) and cross-encoder scores (~1362 ms). The reranker cache protects the most expensive stage and is as safe as an embedding cache." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the cache that answered the wrong tier", body: [
      { t: "p", text: "A pricing assistant caches answers on query embedding with a 0.85 threshold. A customer asks about limits on the Starter plan and receives the cached answer for the Growth plan \u2014 correct numbers, wrong tier, with a citation to the real pricing document." },
      { t: "p", text: "Parametrised questions are the worst case for an embedding cache, because the template dominates the vector and the parameter is one token. The team's evaluation used obvious paraphrases, where similarity separates cleanly, so the measured hit quality looked excellent." },
      { t: "p", text: "Two changes. Raise the threshold until wrong hits are zero on an adversarial set, accepting the lower hit rate \u2014 at 0.90 this measurement served none. And for parametrised domains, do not cache semantically at all: extract the parameter and key the cache on `(template, parameter)`, which turns a similarity judgement into an exact match. The general rule is that semantic caching is for questions whose meaning is the whole content, and parametrised questions are not those." }
    ] }
  ],
  takeaways: [
    "**Both failure modes are reachable with ordinary queries.**",
    "**Different questions score high**: `is retention 30 days` against `is retention 90 days` = 0.8762.",
    "**Genuine paraphrases score low**: `where is my money` against `when do I get a refund` = 0.2404.",
    "**An embedding encodes topic**, so it compresses away the decisive token and misses the equivalence.",
    "**The cache fails in exactly 5.4's two ways**, and they pull the threshold in opposite directions.",
    "**No threshold has zero of both errors** \u2014 at 0.85, 2 wrong served and 5 of 8 repeats missed.",
    "**Caveat any summary statistic from an adversarial sample** \u2014 the AUC of 0.375 is not a real-world estimate.",
    "**A miss costs latency; a wrong hit serves a false statement with a citation.**",
    "**So tune from the cost of the wrong answer** \u2014 at 0.90 this cache served zero wrong answers.",
    "**Hit rate is the easy metric and its optimum is the bottom of the sweep.**",
    "**One error generates feedback and the other does not** \u2014 7.1's problem again.",
    "**The safe caches are keyed on exact text or an exact pair**: embeddings (~104 ms) and reranker scores (~1362 ms).",
    "**The reranker cache protects the most expensive stage and is as safe as an embedding cache.**",
    "**A cached answer has two expiry conditions**: time, and any cited document changing.",
    "**For parametrised questions, key on (template, parameter)** rather than caching semantically."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Why do \u201cis retention 30 days\u201d and \u201cis retention 90 days\u201d score 0.8762?",
      options: ["The embedding model handles numbers poorly as a known defect",
        "An embedding encodes topic, and these have identical topics \u2014 the decisive difference is one quantity in the same sentence slot",
        "Short queries always score high against each other",
        "The pair shares more than 80% of its characters"],
      answer: 1,
      why: "Both sentences are about retention periods, which is what the vector captures; 30 and 90 are interchangeable quantities in the same position. That makes parametrised questions the worst case for a semantic cache, because the template dominates the representation and the parameter \u2014 the part that decides the answer \u2014 contributes almost nothing. Keying on (template, parameter) avoids the judgement entirely." },
    { stem: "An AUC of 0.375 was measured for similarity as a paraphrase classifier. How should it be reported?",
      options: ["As evidence that semantic caching does not work",
        "With the caveat that both populations were chosen adversarially, so it shows the failures are reachable rather than how often they occur",
        "As a baseline to improve on with a better embedding model",
        "As the expected production hit quality"],
      answer: 1,
      why: "The paraphrases were deliberately chosen to share no vocabulary and the near-misses to differ in one decisive token, so the sample is not representative of real traffic where most repeats are easy. Reporting the figure without that caveat would be misleading in the same way as reporting a ceilinged metric \u2014 the number is real and it answers a narrower question than it appears to." },
    { stem: "Why is hit rate the wrong objective for tuning a semantic cache?",
      options: ["It is expensive to measure accurately",
        "It improves monotonically as the threshold falls, so its optimum is the setting where most hits are wrong",
        "It ignores latency savings",
        "It cannot be measured without labelled paraphrases"],
      answer: 1,
      why: "Lowering the threshold always increases hits, so optimising hit rate drives you to the bottom of the sweep where eight of fourteen hits were wrong. It is also the error that generates no feedback: a user who waits complains, and a user given a confident wrong answer believes it. That is the same asymmetry 7.1 identified when tuning an abstention guard on the proportion answered." },
    { stem: "Which cache layer carries no semantic risk and saves the most?",
      options: ["The final answer, keyed on query embedding",
        "Cross-encoder scores, keyed on the exact (query, document) pair",
        "The retrieval result, keyed on query embedding",
        "The query embedding, which is the cheapest stage"],
      answer: 1,
      why: "A cross-encoder score is a function of an exact query-document pair and cannot change unless the document does, so it is as safe as an embedding cache \u2014 and it protects the stage 6.1 measured at 68 ms per pair, roughly 1362 ms for twenty candidates. It is the underused layer, while the answer cache that everybody builds is the only one that can tell a user something false." }
  ] },
  interview: { title: "Interview practice", sub: "Semantic caching", questions: [
    { level: "core", q: "How would you set the threshold on a semantic cache?",
      strong: "A strong answer tunes from the cost of a wrong hit, not the hit rate.",
      answer: [
        { t: "p", text: "From the cost of a wrong hit, and high \u2014 accepting a low hit rate, because the two errors are not comparable." },
        { t: "p", text: "A miss costs latency: you do the work you would have done anyway and the user gets a correct answer slightly later. A wrong hit serves a confidently false statement to a different question, with a citation to a real document, and the user has no way to tell." },
        { t: "p", text: "When I measured it on an adversarial set, 0.90 was the first threshold with zero wrong answers, and it missed five of eight genuine repeats. I would take that trade." },
        { t: "p", text: "What I would not do is tune on hit rate, which is the easy metric and improves monotonically as the threshold falls \u2014 so its optimum is the setting where most hits are wrong. It is also the error nobody reports: a user who waits complains, and a user given a wrong answer believes it." }
      ] },
    { level: "advanced", q: "What breaks a semantic cache?",
      strong: "A strong answer names parametrised questions and the staleness condition.",
      answer: [
        { t: "p", text: "Parametrised questions, mainly. The template dominates the embedding and the parameter is one token \u2014 which is the part that decides the answer." },
        { t: "p", text: "I measured 'is retention 30 days' against 'is retention 90 days' at 0.8762, and cancelling an annual plan against a monthly plan at 0.8703. Different answers, and a cache at 0.85 serves one for the other. Meanwhile real paraphrases can score very low: 'where is my money' against 'when do I get a refund' was 0.2404, because they share no vocabulary." },
        { t: "p", text: "So the failures pull the threshold in opposite directions and there is no setting with zero of both. For parametrised domains I would not cache semantically at all \u2014 extract the parameter and key on the template plus the parameter, which turns a similarity judgement into an exact match." },
        { t: "p", text: "The other thing that breaks it is staleness, and it is usually unhandled. A cached answer was grounded in documents that change, so it has two expiry conditions: a TTL, which everyone implements, and source change, which almost nobody does. If the entry stores the cited document ids, a document update invalidates exactly the entries that depended on it. Without that, correcting a document leaves the cache serving the old answer to the people most likely to ask again." },
        { t: "p", text: "And honestly, I would build the safe caches first. Query embeddings keyed on exact text were about 104 ms of a dense query's latency, and cross-encoder scores keyed on an exact query-document pair were over a second. Both are deterministic given the document, so they carry no semantic risk at all, and they are the ones people skip to build the risky one." }
      ] },
    { level: "core", q: "Would you cache answers in a RAG system at all?",
      strong: "A strong answer builds the safe layers first and justifies the order.",
      answer: [
        { t: "p", text: "Not first. I would build the layers with no semantic risk before the one that can tell a user something false, and in my measurements those were also where most of the latency was." },
        { t: "p", text: "Query embeddings keyed on exact query text: about 104 ms, deterministic, and most of a dense query's latency. Cross-encoder scores keyed on an exact query-document pair: over a second for twenty candidates, and the score cannot change unless the document does. Both are as safe as caching a pure function, and both are routinely skipped in favour of the answer cache." },
        { t: "p", text: "If I did cache answers, it would be at a high threshold \u2014 0.90 was the first setting with zero wrong hits on my adversarial set, missing five of eight genuine repeats. I would take that, because a miss costs latency and a wrong hit is a false statement with a citation attached." },
        { t: "p", text: "And I would carve out parametrised questions entirely. 'Is retention 30 days' against 'is retention 90 days' scored 0.8762, so any usable threshold either serves one for the other or rejects real paraphrases. For those I would extract the parameter and key on template plus parameter, turning a similarity judgement into an exact match." },
        { t: "p", text: "Plus invalidation on source change, not just a TTL \u2014 which needs the entry to record the document ids its answer cited." }
      ] }
  ] }
});

EC.receiveLesson({
  id: "6.2",
  lede: "There is no cleverness inside a vector search. Computing cosine by hand in a Python loop reproduces the library's ranking to within **8.3 \u00d7 10\u207b\u2078** \u2014 float32 rounding \u2014 the only difference being that the library's loop is written in C. Worth doing once, because it also bounds what tuning can achieve: there are no hyperparameters in a dot product. And it exposes the behaviour that matters more than any accuracy number. A similarity search **always returns k results**. Asked for the airspeed velocity of an unladen swallow, this corpus returns a document about rate limits at 0.1279 \u2014 while a genuinely failed retrieval scores **0.4445**. The failure outscores the correct non-answer.",
  objectives: [
    "Implement cosine similarity and verify it against the library",
    "Measure the dense baseline on two query classes",
    "Name the three failure classes with a worked case for each",
    "Explain why a similarity score is not a confidence",
    "Say what a retriever does when nothing in the corpus is relevant"
  ],
  prerequisites: ["5.4", "6.1"],
  blocks: [
    { t: "h2", n: "01", id: "scratch", text: "Cosine, by hand", sub: "And it matches to float noise" },

    {"kind": "steps", "title": "There is no cleverness inside a vector search", "caption": "Computing cosine by hand in a Python loop reproduced the library's ranking to within **8.3 × 10⁻⁸** — float32 rounding. The only difference is that the library's loop is written in C, which is a performance fact and not a conceptual one.", "items": [{"label": "normalise both vectors", "desc": "so the dot product IS the cosine", "tone": "accent", "code": "numpy"}, {"label": "dot the query against every document", "desc": "one multiply-add per dimension, 384 of them", "tone": "good", "code": "a loop"}, {"label": "sort descending, take k", "desc": "and k results always come back, however irrelevant", "tone": "warn", "code": "argsort"}, {"label": "the ranking matched to 8.3e-08", "desc": "float32 rounding — so the library adds speed, not insight", "tone": "good", "code": "verified"}], "t": "diagram", "id": "dg-6_2-01-0"},




    { t: "code", lang: "python", title: "The whole of a vector search",
      code: 'mine = []\nfor i, t in enumerate(TXT):\n    d = EMB[i]\n    num = sum(float(a) * float(b) for a, b in zip(v, d))\n    den = (math.sqrt(sum(float(a) * a for a in v))\n           * math.sqrt(sum(float(b) * b for b in d)))\n    mine.append(num / den)',
      out: "  top 3 by hand-written cosine:\n    api-limits           0.463018\n    bill-cancel-sub      0.333873\n    bill-overage         0.284438\n  max absolute difference from the library: 8.28e-08",
      caption: "`8.28e-08` is float32 rounding. The ranking is identical." },
    { t: "callout", kind: "insight", title: "Worth doing once", body: [
      { t: "p", text: "A vector search is a dot product, a division and a sort. Knowing that concretely changes how you debug one: when retrieval misbehaves the cause is in the embeddings, the normalisation or the candidate set, because there is nowhere else for it to hide." },
      { t: "p", text: "It also sets the right expectation about tuning. There are no hyperparameters in this computation, so when dense retrieval fails on a query class, no amount of configuring it will help \u2014 the fix has to introduce a different signal. That is what 6.3 through 6.7 are." }
    ] },
    { t: "h2", n: "02", id: "baseline", text: "The baseline on two query classes", sub: "And the gap between them" },
    { t: "code", lang: "text", title: "The same retriever, measured twice",
      code: "natural queries : R@5 1.000  MRR 0.964  NDCG 0.974\nexact terms     : R@5 0.875  MRR 0.781  NDCG 0.804",
      caption: "One retriever, two very different verdicts." },
    { t: "h3", text: "The three failure classes" },
    { t: "dl", items: [
      ["exact terms", "`Retry-After` returns `api-idempotency` (0.4445), `api-webhooks`, `bill-refund` \u2014 all plausibly about API behaviour, none containing the header. The decisive signal is literal presence, which a similarity score cannot represent."],
      ["vocabulary mismatch", "`I forgot my password` ranks `auth-reset` first at only **0.3064**, and it works because the model happens to bridge *password* and *credential recovery*. 6.3 shows the same query matching **nothing at all** lexically."],
      ["near-duplicate competition", "`stop my plan renewing` returns `bill-cancel-sub` (0.4846), `bill-cancel-trial`, `bill-overage`, `ops-cancel-report` \u2014 the right one first, and three documents answering different questions behind it."]
    ] },
    { t: "h2", n: "03", id: "notconfidence", text: "The scores are not confidences", sub: "And the retriever cannot abstain" },
    { t: "code", lang: "text", title: "Three queries, one of them nonsense",
      code: "0.4630   api-limits            'how many calls can I make before being throt'\n0.4445   api-idempotency       'Retry-After'\n0.1279   api-limits            'what is the airspeed velocity of an unladen '",
      caption: "Row 2 is a **failed** retrieval; row 3 is a correct non-answer. The failure scores higher." },
    { t: "callout", kind: "warn", title: "A similarity search has no concept of \u201cnothing matched\u201d", body: [
      { t: "p", text: "`k=5` is a promise to return five documents, and it is kept regardless of whether anything in the corpus is relevant. The retriever has no output that means *no*, so a question the corpus cannot answer produces five documents and a confident answer grounded in them." },
      { t: "p", text: "And the three scores are not comparable the way they look. 0.4445 for `Retry-After` is a failure \u2014 the relevant document is not in the list at all \u2014 while 0.1279 for nonsense is a correct non-answer wearing a low number. Any threshold that rejects the nonsense accepts the failure. That is the problem 7.1 has to solve, and it cannot be solved with one number." }
    ] },
    { t: "exercise", kind: "build", title: "Implement cosine, then find the limits",
      difficulty: "core", minutes: 26,
      body: "Compute cosine similarity in a plain Python loop and verify the maximum absolute difference against the library's vectorised result. Then measure the dense baseline on natural queries and on rare exact terms, and show one worked case for each of the three failure classes. Finally, show what the retriever returns for a query the corpus cannot answer, and compare that score against a failed retrieval.",
      requirements: ["Implement cosine explicitly and report the max absolute difference from the library",
        "State what that difference is and why the ranking is unaffected",
        "Measure R@5, MRR and NDCG on both query classes",
        "Show a worked case for each of three failure classes with scores",
        "Query for something the corpus cannot answer and show the result",
        "Compare the nonsense score against a failed retrieval's score and say what that rules out"],
      hint: "Ask the retriever something absurd, then compare its top score against a query where retrieval genuinely failed. The ordering of those two numbers is the point.",
      solution: { lang: "python", title: "x0602.py \u2014 it always returns k",
        code: 'mine = [sum(float(a) * float(b) for a, b in zip(v, EMB[i]))\n        / (math.sqrt(sum(float(a) * a for a in v))\n           * math.sqrt(sum(float(b) * b for b in EMB[i])))\n        for i in range(len(TXT))]\nprint("max diff: %.2e" % float(np.max(np.abs(np.array(mine) - (EMB @ v)))))\n\nfor q in ["how many calls can I make before being throttled",\n          "Retry-After",\n          "what is the airspeed velocity of an unladen swallow"]:\n    did, sc = dense_scored(q, 1)[0]\n    print("%.4f   %-20s  %r" % (sc, did, q[:44]))',
        out: "==============================================================================\nPART 1 -- cosine from scratch against the library\n==============================================================================\n  query: 'how many calls can I make before being throttled'\n  top 3 by hand-written cosine:\n    api-limits           0.463018\n    bill-cancel-sub      0.333873\n    bill-overage         0.284438\n  max absolute difference from the library: 8.28e-08\n\n  identical. there is no hidden cleverness in a vector search --\n  it is this loop, with the loop written in C.\n==============================================================================\nPART 2 -- the baseline, and what it reliably misses\n==============================================================================\n  natural queries : R@5 1.000  MRR 0.964  NDCG 0.974\n  exact terms     : R@5 0.875  MRR 0.781  NDCG 0.804\n\n  the three failure classes, each with a worked case:\n\n  'Retry-After'            (an exact term with no lexical channel)\n      1. api-idempotency      0.4445\n      2. api-webhooks         0.3906\n      3. bill-refund          0.3623\n      4. bill-cancel-order    0.3489\n  'I forgot my password'   (vocabulary mismatch)\n      1. auth-reset           0.3064\n      2. auth-signin-fail     0.2580\n      3. bill-cancel-trial    0.2502\n      4. api-idempotency      0.2081\n  'stop my plan renewing'  (near-duplicate competition)\n      1. bill-cancel-sub      0.4846\n      2. bill-cancel-trial    0.4098\n      3. bill-overage         0.3282\n      4. ops-cancel-report    0.3182\n==============================================================================\nPART 3 -- the scores are not confidences\n==============================================================================\n  top-1 cosine for each of three very different queries:\n    0.4630   api-limits            'how many calls can I make before being throt'\n    0.4445   api-idempotency       'Retry-After'\n    0.1279   api-limits            'what is the airspeed velocity of an unladen '\n\n  the nonsense query still returns a document with a positive score.\n  a similarity search ALWAYS returns k results -- it has no concept of\n  'nothing matched'. 7.1 has to add one.",
        notes: [
          { t: "p", text: "**The hand-written loop matches the library to 8.28e-08**, which is float32 rounding. A vector search is a dot product, a division and a sort, with the loop written in C." },
          { t: "p", text: "**Which bounds what tuning can do.** There are no hyperparameters in this computation, so when dense retrieval fails the fix cannot come from configuring it \u2014 it has to come from a different signal." },
          { t: "p", text: "**The same retriever gets two very different verdicts**: MRR 0.964 on natural queries against 0.781 on rare exact terms." },
          { t: "p", text: "**Three failure classes, each with a worked case**: exact terms where literal presence decides, vocabulary mismatch where the top score is only 0.3064, and near-duplicate competition where three of four slots answer a different question." },
          { t: "p", text: "**A similarity search always returns k results.** Asked something absurd, it returned a document about rate limits at 0.1279 \u2014 there is no output meaning \u2018nothing matched\u2019." },
          { t: "p", text: "**And a failed retrieval outscored the correct non-answer**: 0.4445 for a query whose relevant document was missing entirely, against 0.1279 for nonsense." },
          { t: "p", text: "**So no single threshold separates good from bad**, and a no-context guard needs more than a similarity number. 7.1 has to construct one." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the chatbot that answered a question about a competitor", body: [
      { t: "p", text: "A support bot over one company's documentation is asked about a competitor's product. It returns five documents from its own corpus and produces a detailed, confident, entirely inapplicable answer." },
      { t: "p", text: "Nothing malfunctioned. `k=5` was honoured, the five most similar documents were returned, and the model grounded its answer in them exactly as instructed. The corpus simply contains nothing relevant, and no component in the pipeline has a way to say so." },
      { t: "p", text: "The structural point is that abstention has to be added \u2014 it is not a degraded mode retrieval falls into on its own. And it cannot be built from raw similarity, because this lesson's three queries show a failed retrieval at 0.44 sitting above a correct non-answer at 0.13. 7.1 builds the guard; what this lesson establishes is that something must, and that it needs a better signal than a score." }
    ] }
  ],
  takeaways: [
    "**Cosine by hand matches the library to 8.28e-08** \u2014 float32 rounding, identical ranking.",
    "**A vector search is a dot product, a division and a sort**, with the loop written in C.",
    "**So when dense retrieval fails, configuring it will not help** \u2014 there are no hyperparameters in it.",
    "**The fix has to introduce a different signal**, which is what 6.3 to 6.7 supply.",
    "**One retriever, two verdicts**: MRR 0.964 on natural queries against 0.781 on rare exact terms.",
    "**Three failure classes**: exact terms, vocabulary mismatch, near-duplicate competition.",
    "**A similarity search always returns k results** and has no output meaning \u2018nothing matched\u2019.",
    "**A nonsense query returned a real document at 0.1279.**",
    "**A failed retrieval scored 0.4445** \u2014 higher than the correct non-answer.",
    "**So any threshold that rejects the nonsense also accepts the failure.**",
    "**Abstention must be added deliberately** and cannot be built from raw similarity alone."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A hand-written cosine loop differs from the library's result by 8.28e-08. What does that tell you?",
      options: ["The library applies an undocumented normalisation",
        "They are the same computation \u2014 the difference is float32 rounding, so the ranking is identical",
        "The hand-written version is wrong in the eighth decimal place",
        "The library uses a different distance metric internally"],
      answer: 1,
      why: "A difference at the eighth decimal place is accumulated floating-point error from summing in a different order, not a difference in algorithm. The practical consequence is that a vector search has no hidden machinery: it is a dot product, a division and a sort. That bounds what tuning can achieve, because there are no parameters in it to tune." },
    { stem: "Why does a similarity search return results for a query the corpus cannot answer?",
      options: ["The embedding model hallucinates a match",
        "k is a promise to return k documents, and nothing in the retriever can express 'nothing matched'",
        "The index pads results to the requested count",
        "The query embedding defaults to the corpus centroid"],
      answer: 1,
      why: "The retriever sorts every document by similarity and returns the top k, which is well defined even when the best match is irrelevant. There is no output value meaning no, so abstention has to be added deliberately downstream \u2014 it is not a mode retrieval falls into when it fails. A nonsense query here returned a document about rate limits at 0.1279." },
    { stem: "Top-1 cosine was 0.4445 for a failed exact-term query and 0.1279 for a nonsense query. What follows?",
      options: ["The threshold should be set between 0.13 and 0.44",
        "No single threshold works \u2014 a failed retrieval outscored a correct non-answer by a wide margin",
        "Exact-term queries need a higher threshold than natural ones",
        "Cosine is miscalibrated below 0.5"],
      answer: 1,
      why: "The 0.4445 case is a failure, since the relevant document is absent from the results entirely, and the 0.1279 case is a correct non-answer. Any threshold rejecting the nonsense also accepts the failure, and vice versa. That is why a no-context guard cannot be built from raw similarity alone, and why 7.1 needs score separation or a second model rather than a number." },
    { stem: "Dense retrieval misses a query about a header name. Why will tuning not help?",
      options: ["The index needs rebuilding with more dimensions",
        "There are no hyperparameters in a cosine computation \u2014 the needed signal, literal presence, cannot be represented",
        "k should be raised until the document appears",
        "The query is too short for the model's context window"],
      answer: 1,
      why: "A cosine similarity between two fixed vectors has nothing to configure; the computation is a dot product and a division. The signal that would settle an exact-term query \u2014 this document literally contains that string \u2014 is discarded when text becomes an embedding. So the fix must introduce a different signal, which is what a lexical retriever does." }
  ] },
  interview: { title: "Interview practice", sub: "Dense retrieval and its limits", questions: [
    { level: "core", q: "Would you implement cosine similarity yourself in production?",
      strong: "A strong answer says no and explains why doing it once is still worth it.",
      answer: [
        { t: "p", text: "No \u2014 the library's version is the same computation with the loop in C, and I measured the difference at about 8e-08, which is float32 rounding." },
        { t: "p", text: "But writing it once is worth the half hour, because of what it tells you about everything downstream. A vector search turns out to be a dot product, a division and a sort. There is nothing else in there." },
        { t: "p", text: "That changes how you debug retrieval. When it misbehaves, the cause is in the embeddings, the normalisation or the candidate set, because there is nowhere else for it to hide. And it sets the right expectation about tuning: there are no hyperparameters in that computation, so when dense retrieval fails on a whole query class, configuring it harder will not help." },
        { t: "p", text: "Which is the useful conclusion. The fix has to introduce a different signal \u2014 lexical matching, a cross-encoder, a rewritten query \u2014 rather than a better setting." }
      ] },
    { level: "advanced", q: "What happens when someone asks your RAG system a question your corpus cannot answer?",
      strong: "A strong answer says it answers anyway, and explains why scores cannot fix it.",
      answer: [
        { t: "p", text: "By default it answers anyway, confidently, and that is not a bug in any component." },
        { t: "p", text: "k is a promise to return k documents, and a similarity search keeps it by sorting everything and taking the top of the list \u2014 which is well defined even when the best match is irrelevant. I tried an absurd query against a support corpus and got back a document about rate limits with a positive score. The model then grounds its answer in those documents exactly as instructed and produces something fluent and inapplicable." },
        { t: "p", text: "So abstention has to be built. It is not a degraded mode retrieval falls into when it fails \u2014 there is no output anywhere in the pipeline that means no." },
        { t: "p", text: "The part people get wrong is assuming a score threshold is enough. In my measurements the nonsense query scored 0.128, and a query where retrieval genuinely failed \u2014 the relevant document was not in the results at all \u2014 scored 0.445. The failure is more than three times higher than the correct non-answer, so any threshold that rejects one accepts the other." },
        { t: "p", text: "A usable guard needs something else: the separation between the top result and the next, a cross-encoder check on the top candidate, or the model's own licence to say it does not know \u2014 and in practice more than one of those." }
      ] },
    { level: "core", q: "What are the query types dense retrieval reliably fails on?",
      strong: "A strong answer names three classes with a mechanism each.",
      answer: [
        { t: "p", text: "Three, and each has a different mechanism, which matters because they need different fixes." },
        { t: "p", text: "First, rare exact terms \u2014 header names, error codes, protocol names. The decisive signal is that a document literally contains the string, and that is exactly what gets discarded when text becomes an embedding. On my corpus a query for an HTTP header returned three plausible API documents, none of which contained it. The fix is a lexical retriever." },
        { t: "p", text: "Second, vocabulary mismatch, where the user's words and the document's words have no overlap. In my measurements the relevant document for 'I forgot my password' said 'credential recovery, signed recovery link' and scored only 0.31 \u2014 it worked, but barely, and purely because the model happened to bridge the two. The fix is query transformation." },
        { t: "p", text: "Third, near-duplicate competition. A query about stopping a subscription returned four different cancellation procedures; the right one ranked first and three slots went to documents answering different questions. That is a diversity problem, and the metrics will look perfect while it happens." },
        { t: "p", text: "And underneath all three, the retriever always returns k results. There is no output meaning nothing matched, so each of these failures arrives looking exactly like a success." }
      ] }
  ] }
});

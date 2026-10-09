EC.receiveLesson({
  id: "7.4",
  lede: "5.7 argued the citation is the one verifiable part of the grounding. This lesson collects on that, and the collection has a sharp edge. Checking whether a cited id was actually retrieved costs **a regex** and catches a fabricated citation with certainty. Checking whether the document *supports the claim* is a different problem, and the obvious proxy fails at it: scoring a claim against its cited document with a cross-encoder gives **+10.094** for a supported claim and **+5.293** for one the document flatly **contradicts** \u2014 both strongly positive \u2014 while correctly rejecting an off-topic claim at \u22129.245. A relevance model detects wrong *topics* and cannot detect wrong *facts*.",
  objectives: [
    "Distinguish the three ways a citation can be wrong",
    "Implement the free check and say exactly what it catches",
    "Show why a relevance model is not an entailment check",
    "Count what a per-claim faithfulness check costs",
    "Layer checks by cost against coverage"
  ],
  prerequisites: ["5.7", "6.1"],
  blocks: [
    { t: "h2", n: "01", id: "threeways", text: "Three ways a citation goes wrong", sub: "Only one is free to catch" },
    { t: "code", lang: "text", title: "The same context, three answers",
      code: "context: ['data-retention', 'data-deletion', 'auth-session']\n\n'Retention defaults to 90 days, configurable 30 to 730. [data-retention]'\n  -> cited id was retrieved, and supports the claim            CORRECT\n\n'Retention is 180 days by default. [data-policy]'\n  -> cited id was NEVER retrieved                             CAUGHT by a regex\n\n'Retention defaults to 90 days. [auth-session]'\n  -> cited id WAS retrieved, and does not support the claim    NOT caught",
      caption: "The second and third answers are both wrong and only one is detectable cheaply." },
    { t: "callout", kind: "insight", title: "The free check is worth having anyway", body: [
      { t: "p", text: "Extracting cited ids and testing membership in the retrieved set is a regex and a set lookup. It catches a **fabricated** citation \u2014 an id the model invented \u2014 with certainty rather than probabilistically, which is rare in this field." },
      { t: "p", text: "It also catches the loudest failure, because a fabricated citation usually accompanies an answer the model produced from training data rather than from the context \u2014 5.7's *correct ungrounded answer*, which is otherwise undetectable. So run it on every response: it costs nothing and it is exact." }
    ] },
    { t: "h2", n: "02", id: "entailment", text: "Does the document support the claim?", sub: "And why the obvious proxy fails" },
    { t: "p", text: "The proper check is natural-language inference \u2014 does the document **entail** the sentence. No NLI model is installed in this environment, so what follows uses the cross-encoder as a relevance proxy and is labelled as such. The result is that the proxy does not work, which is more useful than if it had." },
    { t: "code", lang: "text", title: "Claim against its cited document",
      code: "  +10.094   supported                     'Retention defaults to 90 days and enterprise...'\n   +5.293   CONTRADICTED by the document  'Retention is 180 days by default.'\n   -9.245   unrelated to this document    'Sessions expire after inactivity.'",
      caption: "The contradiction scores **strongly positive**." },
    { t: "callout", kind: "trap", title: "Relevance and entailment are different questions", body: [
      { t: "p", text: "A sentence that contradicts a document is **topically very close** to it \u2014 *\u201cretention is 180 days\u201d* is about exactly what the retention document is about. So a relevance model scores it highly, and it is doing its job correctly." },
      { t: "p", text: "This is 5.4's similarity-against-relevance distinction one level up: relevance is not entailment, in the same way similarity was not relevance. A cross-encoder detects claims about the wrong **topic** and cannot detect claims with the wrong **facts** \u2014 which is the half that matters, because an off-topic claim is usually obvious to the reader and a wrong number is not." }
    ] },
    { t: "p", text: "So the component you would reach for does not do the job. A real faithfulness check needs a model trained on entailment, or a model prompted specifically to judge support with the document in front of it \u2014 and either way it is a model call, which brings the cost question." },
    { t: "h2", n: "03", id: "cost", text: "What a faithfulness check costs", sub: "Per claim, not per answer" },

    {"kind": "matrix", "title": "One grounding check is certain, the rest are judgement", "caption": "Checking whether a cited id was actually retrieved costs a **regex** and catches a fabricated citation with **certainty**. Everything else — whether the claim is supported by the cited text — needs a model, and inherits that model's judgement.", "cols": ["cost", "certainty"], "rows": ["was the cited id retrieved?", "does it support the claim?", "is anything uncited?", "is the answer complete?"], "cells": [[{"text": "a regex", "tone": "good"}, {"text": "CERTAIN", "tone": "good"}], [{"text": "a model call", "tone": "warn"}, {"text": "judgement", "tone": "warn"}], [{"text": "a regex", "tone": "good"}, {"text": "certain, but noisy", "tone": "warn"}], [{"text": "a model call", "tone": "crit"}, {"text": "judgement, unreliable", "tone": "crit"}]], "t": "diagram", "id": "dg-7_4-03-0"},




    { t: "code", lang: "text", title: "A four-sentence answer",
      code: "- Retention defaults to 90 days\n- Enterprise tenants can configure between 30 and 730 days\n- Deletion requests complete within 30 days\n- Backups are retained separately for 35 days\n\nclaims to verify : 4\nat 1 call each   : 4x the generation cost of the answer itself",
      caption: "Checking at the answer level passes if **any** part is grounded." },
    { t: "p", text: "That is the trap in a cheap implementation: a single check over the whole answer against the whole context will pass an answer whose first sentence is grounded and whose fourth is invented. Faithfulness is a property of each claim, so the check has to decompose the answer \u2014 which is itself a model call." },
    { t: "callout", kind: "tradeoff", title: "Which is why it is sampled", body: [
      { t: "p", text: "At several calls per response, verifying everything can cost more than generating everything. So faithfulness checking in production is usually either **sampled** \u2014 a percentage of traffic, for monitoring rather than blocking \u2014 or **targeted** at responses another signal already flagged." },
      { t: "p", text: "7.1's guard is the natural trigger: it measured AUC 0.943 at identifying queries where retrieval was weak, and those are exactly the responses most likely to be ungrounded. Spending the expensive check there rather than uniformly is the same routing argument that 7.2 reached about query transformation." }
    ] },
    { t: "h2", n: "04", id: "layer", text: "The layering", sub: "By cost against coverage" },
    { t: "table", head: ["cost", "coverage", "check"], rows: [
      ["free", "every answer", "cited ids exist in the retrieved context"],
      ["free", "every answer", "the answer contains at least one citation"],
      ["cheap", "every answer", "every sentence making a factual claim carries a citation"],
      ["expensive", "sampled or flagged", "per-claim entailment against the cited document"]
    ] },
    { t: "callout", kind: "mental", title: "5.7's principle, one layer on", body: [
      { t: "p", text: "When you cannot enforce a behaviour, ask for an output that makes it auditable \u2014 and then **audit the cheap part always and the expensive part sometimes**." },
      { t: "p", text: "The citation requirement is what makes any of this possible. Without it there is nothing to check: you cannot determine from an answer alone whether the model confined itself to the context. With it, three of the four checks above are free, and the fourth has a well-defined target." }
    ] },
    { t: "exercise", kind: "build", title: "Check an answer against its sources",
      difficulty: "advanced", minutes: 32,
      body: "Take several answers against a known retrieved context and classify the ways each citation can be wrong. Implement the free check and state exactly which failures it catches. Then attempt a support check with a cross-encoder, including a claim the document contradicts, and report what happens. Count what a per-claim check costs on a multi-sentence answer, and produce a layering of checks by cost against coverage.",
      requirements: ["Classify at least three ways a citation can be wrong",
        "Implement the cited-id check and state what it catches with certainty",
        "Score a supported claim, a contradicted claim and an unrelated claim",
        "State which of the three the proxy fails to distinguish and why",
        "Explain why faithfulness is per claim rather than per answer",
        "Count the cost of a per-claim check on a four-sentence answer",
        "Layer the checks by cost against coverage"],
      hint: "Include a claim the cited document directly contradicts. A relevance model's score on that case is the whole point.",
      solution: { lang: "python", title: "x0704.py \u2014 the contradiction scored +5.293",
        code: 'import re\n\n# the free check\nfor ans, ctx, note in answers:\n    cited = re.findall(r"\\[([a-z0-9\\-]+)\\]", ans)\n    ok = [c for c in cited if c in ctx]\n    bad = [c for c in cited if c not in ctx]\n    print("cited %s  in context: %s  fabricated: %s" % (cited, ok, bad))\n\n# the proxy that does not work\nce = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")\nclaims = [\n    ("Retention defaults to 90 days and enterprise tenants can configure 30 to 730 days.",\n     "data-retention", "supported"),\n    ("Retention is 180 days by default.", "data-retention", "CONTRADICTED"),\n    ("Sessions expire after inactivity.", "data-retention", "unrelated"),\n]\nfor claim, did, note in claims:\n    s = float(ce.predict([(claim, BY_ID[did].page_content)])[0])\n    print("%+8.3f  %-16s %s" % (s, note, claim[:40]))',
        out: "==============================================================================\nPART 1 -- the cheap check: is the cited document even in the context\n==============================================================================\n  5.7 made the citation the one verifiable part of the grounding.\n  the first check costs nothing: did the model cite an id it was given?\n\n  answer : Retention defaults to 90 days, configurable 30 to 730. [data-reten\n    cited ['data-retention']   in context: ['data-retention']   fabricated: []\n    -> cited id was retrieved\n\n  answer : Retention is 180 days by default. [data-policy]\n    cited ['data-policy']   in context: []   fabricated: ['data-policy']\n    -> cited id was NEVER retrieved\n\n  answer : Retention defaults to 90 days. [auth-session]\n    cited ['auth-session']   in context: ['auth-session']   fabricated: []\n    -> cited id WAS retrieved -- wrong doc\n\n  the second and third answers are both wrong and only ONE is caught\n  by the id check. a fabricated id is free to detect. a real id\n  attached to a claim it does not support is not.\n==============================================================================\nPART 2 -- the expensive check: does the document support the claim\n==============================================================================\n  a proper check is natural-language inference -- does the document\n  ENTAIL the sentence. no NLI model is installed here, so what follows\n  uses the cross-encoder as a relevance proxy and is labelled as such.\n\n  claim vs its cited document, cross-encoder score:\n   +10.094  supported                    Retention defaults to 90 days and enterp\n    +5.293  CONTRADICTED by the document Retention is 180 days by default.\n    -9.245  unrelated to this document   Sessions expire after inactivity.\n\n  and here is the check's own failure: a relevance model scores the\n  CONTRADICTION highly, because a sentence that contradicts a document\n  is topically very close to it. relevance and entailment are\n  different questions -- the same distinction 5.4 drew between\n  similarity and relevance, one level up.\n\n  so a cross-encoder is not a faithfulness check. it detects\n  off-topic claims and cannot detect wrong ones, which is the half\n  that matters.\n==============================================================================\nPART 3 -- what a faithfulness check costs\n==============================================================================\n  one extra model call per CLAIM, not per answer -- because an answer\n  with four sentences has four things to verify, and a check at the\n  answer level passes if any part is grounded.\n\n  a 4-sentence answer:\n    - Retention defaults to 90 days\n    - Enterprise tenants can configure between 30 and 730 days\n    - Deletion requests complete within 30 days\n    - Backups are retained separately for 35 days\n\n  claims to verify : 4\n  at 1 call each   : 4x the generation cost of the answer itself\n\n  which is why faithfulness checking is usually sampled rather than\n  applied to every response: verify a percentage of traffic, or only\n  answers the 7.1 guard already flagged as weakly grounded.\n==============================================================================\nPART 4 -- the check that is actually free\n==============================================================================\n  the id check from part 1 costs a regex. it catches a fabricated\n  citation, which is the loudest failure, and it catches it with\n  certainty rather than probabilistically.\n\n  so the sensible layering is:\n    free       every answer     cited ids exist in the context\n    cheap      every answer     answer contains at least one citation\n    expensive  sampled          per-claim entailment against the cited doc\n\n  5.7's principle generalises here: when you cannot enforce a\n  behaviour, ask for an output that makes it auditable -- and then\n  audit the cheap part of it always and the expensive part sometimes.",
        notes: [
          { t: "p", text: "**Three ways a citation goes wrong**: the id was never retrieved (caught by a regex), the id was retrieved but does not support the claim (not caught), and the claim is simply correct." },
          { t: "p", text: "**The free check catches a fabricated id with certainty**, which is rare in this field \u2014 and it catches the loudest failure, because a fabricated citation usually accompanies an answer produced from training data rather than the context." },
          { t: "p", text: "**The cross-encoder proxy fails at support checking**: +10.094 for a supported claim and +5.293 for one the document CONTRADICTS, both strongly positive, against -9.245 for an off-topic claim." },
          { t: "p", text: "**Because a contradicting sentence is topically very close to the document.** \u2018Retention is 180 days\u2019 is about exactly what the retention document is about, so a relevance model scores it highly and is behaving correctly." },
          { t: "p", text: "**Relevance is not entailment** \u2014 5.4's similarity-against-relevance distinction one level up. The proxy detects wrong topics and cannot detect wrong facts, which is the half that matters." },
          { t: "p", text: "**Faithfulness is per claim, not per answer.** A single check over a four-sentence answer passes if any part is grounded, so an answer with three grounded sentences and one invented one passes." },
          { t: "p", text: "**At several calls per response it can cost more than generation**, so it is sampled for monitoring or targeted at responses 7.1's guard already flagged." },
          { t: "p", text: "**Layer by cost against coverage**: the free checks on every answer, the expensive one sampled. And none of it is possible without 5.7's citation requirement \u2014 there would be nothing to check." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the faithfulness score that was always high", body: [
      { t: "p", text: "A team adds a faithfulness check: embed the answer, embed the retrieved context, and flag anything below a similarity threshold. The score is high on nearly every response, including ones support has confirmed were wrong." },
      { t: "p", text: "The check measures whether the answer is **about** the context, which it always is \u2014 the answer was generated from it. A wrong number in a correct sentence about the right topic is maximally similar to the source document, so the mechanism cannot see the error. This lesson's measurement is the same effect: a flat contradiction scored +5.293, strongly positive." },
      { t: "p", text: "The usable replacement has two parts. The free, exact part: check that cited ids were actually retrieved, which catches fabrication outright. The expensive part: a model asked specifically whether a given document supports a given sentence, run per claim and sampled rather than on every response. A similarity score is not a smaller version of that check \u2014 it is measuring a different thing and will look healthy indefinitely." }
    ] }
  ],
  takeaways: [
    "**Three ways a citation goes wrong**: fabricated id, real id that does not support the claim, or correct.",
    "**Checking a cited id against the retrieved set is a regex**, and catches fabrication with certainty.",
    "**It also catches 5.7's correct ungrounded answer**, which is otherwise undetectable.",
    "**A cross-encoder is not a faithfulness check**: +10.094 supported, **+5.293 contradicted**, \u22129.245 off-topic.",
    "**Because a contradicting sentence is topically close to the document** \u2014 the model is behaving correctly.",
    "**Relevance is not entailment**, which is 5.4's similarity-against-relevance distinction one level up.",
    "**So the proxy detects wrong topics and cannot detect wrong facts** \u2014 the half that matters.",
    "**Faithfulness is per claim, not per answer** \u2014 an answer-level check passes if any part is grounded.",
    "**At several calls per response it can cost more than generation**, so it is sampled or targeted.",
    "**7.1's guard is the natural trigger**, at AUC 0.943 for identifying weak retrieval.",
    "**Layer by cost against coverage**: free checks always, the expensive one sampled.",
    "**An answer-to-context similarity score will look healthy indefinitely** \u2014 it measures a different thing.",
    "**None of it is possible without the citation requirement** \u2014 there would be nothing to check."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A claim the cited document flatly contradicts scored +5.293 on a cross-encoder, against +10.094 for a supported claim. Why?",
      options: ["The cross-encoder is miscalibrated for short claims",
        "A contradicting sentence is topically very close to the document, and the model measures relevance rather than entailment",
        "The contradiction shares more vocabulary with the document",
        "Logits are not comparable between claim pairs"],
      answer: 1,
      why: "'Retention is 180 days' is about precisely what the retention document is about, so a relevance model scores it highly and is doing its job. Entailment \u2014 does this document support this sentence \u2014 is a different question, and the gap is the same one 5.4 drew between similarity and relevance. The practical consequence is that the proxy catches wrong topics and misses wrong facts." },
    { stem: "Which citation failure can be caught for free, and with certainty?",
      options: ["A claim the cited document does not support",
        "A cited id that was never in the retrieved context",
        "A claim with no citation at all",
        "A citation attached to the wrong sentence"],
      answer: 1,
      why: "Extracting ids with a regex and testing membership in the retrieved set is exact, not probabilistic \u2014 either the id was there or it was not. It also catches the most important failure indirectly, because a fabricated citation usually accompanies an answer produced from training data rather than from the context, which 5.7 identified as otherwise undetectable." },
    { stem: "Why must a faithfulness check operate per claim rather than per answer?",
      options: ["Models cite per sentence rather than per answer",
        "An answer-level check passes if any part is grounded, so three grounded sentences hide one invented one",
        "Per-answer checks exceed the context window",
        "Claims have different confidence levels"],
      answer: 1,
      why: "Faithfulness is a property of each individual assertion, and a single judgement over a whole answer against a whole context is satisfied by partial grounding. A four-sentence answer therefore needs four checks \u2014 which is what makes the check expensive, and why it is typically sampled or targeted at responses another signal has already flagged." },
    { stem: "A team measures faithfulness as similarity between the answer and the retrieved context. What will they observe?",
      options: ["Low scores on hallucinated answers",
        "Consistently high scores, including on wrong answers, because the answer is always about the context it was generated from",
        "Scores that correlate with retrieval quality",
        "High variance requiring a larger sample"],
      answer: 1,
      why: "The answer was generated from the context, so it is topically aligned with it by construction. A wrong number inside a correct sentence about the right topic is maximally similar to the source. This lesson measured the same effect directly \u2014 a flat contradiction scored strongly positive \u2014 so the metric will look healthy indefinitely while missing exactly the errors it was added to find." }
  ] },
  interview: { title: "Interview practice", sub: "Grounding and faithfulness", questions: [
    { level: "core", q: "How would you check whether an answer is grounded in its sources?",
      strong: "A strong answer separates the free exact check from the expensive one.",
      answer: [
        { t: "p", text: "In two layers, because the cheap half is exact and the expensive half is the one that matters." },
        { t: "p", text: "The cheap layer: require the model to cite document ids, then extract them with a regex and check they were actually in the retrieved set. That is exact rather than probabilistic \u2014 either the id was there or it was not \u2014 and it catches fabrication outright. It also catches the failure where the model answered from training data instead of the context, which is otherwise invisible because the answer can be fluent and even correct." },
        { t: "p", text: "The expensive layer is whether the cited document actually supports the claim. That needs a model asked specifically to judge support, and it has to run per claim, because an answer-level check is satisfied by partial grounding \u2014 three grounded sentences will hide one invented one." },
        { t: "p", text: "Which makes it several calls per response, potentially more than generation costs. So I would sample it for monitoring rather than block on it, and target the sample at responses where the retrieval guard already said the context was weak." }
      ] },
    { level: "advanced", q: "Someone proposes measuring faithfulness as answer-to-context similarity. What do you say?",
      strong: "A strong answer knows it measures the wrong thing and has evidence.",
      answer: [
        { t: "p", text: "That it will look healthy indefinitely while missing the errors it was added to find, because it measures topical alignment rather than support." },
        { t: "p", text: "The answer was generated from the context, so it is about the context by construction. A wrong number inside an otherwise correct sentence on the right topic is maximally similar to the source document." },
        { t: "p", text: "I measured this with a cross-encoder, which is the strongest relevance model I had. A claim the document supported scored +10.1. A claim the document flatly contradicted \u2014 saying 180 days where the document said 90 \u2014 scored +5.3, strongly positive. An off-topic claim scored \u22129.2. So the model distinguishes wrong topics perfectly and cannot distinguish wrong facts at all." },
        { t: "p", text: "And it is not that the model is broken. A contradicting sentence genuinely is topically close to what it contradicts. Relevance and entailment are different questions, in exactly the way similarity and relevance are different questions \u2014 it is the same confusion one level up." },
        { t: "p", text: "So I would replace it with the citation check, which is free and exact, plus a proper entailment judgement sampled per claim. And I would be explicit that a similarity score is not a cheaper version of that check \u2014 it is measuring something else." }
      ] },
    { level: "core", q: "What would you require of an answer so that you can audit it later?",
      strong: "A strong answer names citations and what each becomes possible.",
      answer: [
        { t: "p", text: "A citation of the document id behind each factual claim \u2014 and I would require it even for answers nobody intends to audit, because of how much it unlocks downstream." },
        { t: "p", text: "The immediate use is the free grounding check: extract the ids with a regex and confirm they were in the retrieved context. That is exact rather than probabilistic, and it catches the case where the model answered from training data instead of the context \u2014 which is otherwise invisible, because such an answer can be fluent and even correct." },
        { t: "p", text: "It makes two other things possible that are not about grounding at all. Cache invalidation: if a cache entry records which documents its answer cited, then editing a document invalidates exactly the entries that depended on it \u2014 which is the staleness condition almost nobody implements. And injection detection: an answer citing documents the query had no business touching is a computable signal." },
        { t: "p", text: "So one output requirement serves grounding, caching and security. That is the general shape worth internalising: when you cannot enforce a behaviour, require an output that makes it auditable \u2014 and then the audits you did not plan for become cheap too." }
      ] }
  ] }
});

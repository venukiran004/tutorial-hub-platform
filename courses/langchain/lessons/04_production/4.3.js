EC.receiveLesson({
  id: "4.3",
  lede: "An exact-match cache is exactly exact: a trailing space is a different key, and on ten real-looking queries all asking the same thing it got a **20% hit rate**. Loosening the match buys hits \u2014 up to 80% at a permissive threshold \u2014 and buys a new failure that has no error attached to it. The asymmetry is the whole lesson: **a cache miss costs one model call; a wrong cache hit costs a wrong answer, served fast, to every user who asks that question until the entry expires.** So the threshold is a risk setting rather than a tuning parameter, and the number to measure is not hit rate but wrong-hit rate \u2014 which needs a labelled sample, which is why almost nobody measures it.",
  objectives: [
    "Measure the hit rate of an exact-match cache on realistic traffic",
    "Explain what a looser similarity threshold buys and costs",
    "State the asymmetry between a miss and a wrong hit",
    "Identify query pairs that a similarity cache will wrongly merge",
    "List what must never be cached"
  ],
  prerequisites: ["4.1"],
  blocks: [
    { t: "h2", n: "01", id: "exact", text: "Exact means exact", sub: "A trailing space is a different question" },

    {"kind": "matrix", "title": "An exact-match cache is exactly exact", "caption": "A trailing space is a different key. On ten real-looking queries all asking the same thing, exact matching got a **20%** hit rate; loosening the match bought up to **80%** — and bought a new failure that has no analogue in an exact cache (7.7).", "cols": ["hit rate", "the new failure"], "rows": ["exact match", "normalised key", "semantic, strict", "semantic, permissive"], "cells": [[{"text": "20%", "tone": "crit"}, {"text": "none — it cannot be wrong", "tone": "good"}], [{"text": "higher, still exact", "tone": "warn"}, {"text": "none", "tone": "good"}], [{"text": "moderate", "tone": "warn"}, {"text": "a near-miss answered wrongly", "tone": "warn"}], [{"text": "80%", "tone": "good"}, {"text": "confidently wrong answers", "tone": "crit"}]], "t": "diagram", "id": "dg-4_3-01-0"},




    { t: "code", lang: "python", title: "Setting a cache and hitting it",
      code: 'set_llm_cache(InMemoryCache())\nchain.invoke({"q": "what is LCEL?"})      # model called\nchain.invoke({"q": "what is LCEL?"})      # cache hit, no model call\nchain.invoke({"q": "what is LCEL? "})     # trailing space -> model called',
      out: "first  invoke -> 'cached answer'   (model calls: 1)\nsecond invoke -> 'cached answer'   (model calls: 1)\nthe second call hit the cache: True\na trailing space is a different key -> model calls: 1",
      caption: "The key is the full prompt, so anything that changes the prompt changes the key." },
    { t: "p", text: "That includes things you did not think of as part of the question: a different system prompt, a different retrieved context, one more turn of history. In a conversational application, **exact-match caching almost never hits**, because the history makes every prompt unique." },
    { t: "h2", n: "02", id: "rate", text: "Hit rate on realistic traffic", sub: "Ten queries about one thing" },
    { t: "code", lang: "text", title: "The same question, ten ways",
      code: '10 queries, all about the same thing.\nexact-match hits: 2 (20%)\n\nsemantic-ish, threshold 0.9: 5 hits (50%)\nsemantic-ish, threshold 0.7: 6 hits (60%)\nsemantic-ish, threshold 0.5: 8 hits (80%)',
      caption: "Looser matching buys hits, monotonically. That is the attractive half." },
    { t: "h2", n: "03", id: "wrong", text: "What the hits cost", sub: "Demonstrated, not asserted" },
    { t: "p", text: "At those thresholds nothing in that particular query set joined wrongly, so the risk was real and undemonstrated. Here it is demonstrated \u2014 three pairs that are **different questions** with high word overlap." },
    { t: "table", head: ["Query A", "Query B", "Similarity"], rows: [
      ["reset my password", "reset my username", "0.50"],
      ["cancel my order", "cancel my account", "0.50"],
      ["how do I add a user", "how do I add a payment method", "0.62"]
    ] },
    { t: "callout", kind: "warn", title: "The asymmetry is the whole argument", body: [
      { t: "p", text: "A **miss** costs one model call \u2014 a few cents and some latency, and the user gets a correct answer. A **wrong hit** costs a wrong answer, served fast, with no error raised, to every user who asks that question until the entry expires." },
      { t: "p", text: "Cancelling an order and cancelling an account are not the same request, and a cache that serves one answer for both is doing something far worse than being slow. So the threshold is a risk setting, not a performance dial, and raising it to improve a hit-rate dashboard is optimising the wrong number." }
    ] },
    { t: "p", text: "The measurement that matters is therefore **wrong-hit rate**, which requires a labelled sample of query pairs and a judgement about which differences change the answer. That is real work, which is why hit rate \u2014 which is free to compute and points the wrong way \u2014 is what most teams actually track." },
    { t: "h2", n: "04", id: "never", text: "What must never be cached", sub: "Four categories" },
    { t: "table", head: ["Never cache", "Because"], rows: [
      ["anything personalised", "a cached answer for user A served to user B"],
      ["anything time-sensitive", "balances, stock, status, prices"],
      ["anything with retrieved context", "the index may have changed (7.5)"],
      ["anything non-deterministic by design", "a creative task should vary"]
    ] },
    { t: "callout", kind: "insight", title: "The retrieved-context row is the subtle one", body: [
      { t: "p", text: "A RAG answer looks like a good caching candidate: the same question, the same answer. But the answer was grounded in documents that can change, so a cached response is correct until the index is updated and silently stale afterwards \u2014 with no mechanism to notice." },
      { t: "p", text: "If you cache RAG answers, the cache key has to include something that changes when the index does, which is 7.5's freshness problem arriving a lesson early. The simplest version is an index version in the key, which makes a reindex invalidate everything \u2014 blunt, correct, and usually right." }
    ] },
    { t: "exercise", kind: "analysis", title: "Measure a cache honestly",
      difficulty: "core", minutes: 24,
      body: "Set an exact-match cache and confirm a repeat invocation does not call the model. Show that a trivially different prompt is a different key. Then take ten realistic queries that all ask the same thing and measure the exact-match hit rate, and the hit rate at three similarity thresholds. Then construct pairs that a loose threshold would merge wrongly, and state the asymmetry between a miss and a wrong hit.",
      requirements: ["Show a cache hit by counting model calls before and after",
        "Show that a trailing space produces a miss",
        "Measure exact-match hit rate on at least ten paraphrases of one question",
        "Measure hit rate at three similarity thresholds",
        "Construct at least three pairs that are different questions with high overlap",
        "State what a miss costs and what a wrong hit costs",
        "List four categories that must never be cached"],
      hint: "Use the fake model's call counter to prove a hit. For the adversarial pairs, look for questions sharing a verb and a possessive but differing in the noun that matters.",
      solution: { lang: "python", title: "x0403.py \u2014 20% exactly, 80% dangerously",
        code: 'from langchain_core.globals import set_llm_cache\nfrom langchain_core.caches import InMemoryCache\n\nset_llm_cache(InMemoryCache())\nm = FakeChatModel(script=["cached answer"])\nchain = PROMPT | m | StrOutputParser()\nchain.invoke({"q": "what is LCEL?"}); first = m.calls\nchain.invoke({"q": "what is LCEL?"}); second = m.calls\nprint("hit:", second == first)\n\ndef toks(s):  return set(re.findall(r"[a-z]+", s.lower()))\ndef jaccard(a, b):\n    A, B = toks(a), toks(b)\n    return len(A & B) / float(len(A | B)) if A | B else 0.0\n\nfor thresh in (0.9, 0.7, 0.5):\n    seen, h = [], 0\n    for q in QUERIES:\n        if any(jaccard(q, s) >= thresh for s in seen):\n            h += 1\n        else:\n            seen.append(q)\n    print(thresh, h)\n\nADVERSARIAL = [("reset my password", "reset my username"),\n               ("cancel my order", "cancel my account"),\n               ("how do I add a user", "how do I add a payment method")]',
        out: "==============================================================================\nPART 1 -- exact-match caching\n==============================================================================\n  first  invoke -> 'cached answer'   (model calls: 1)\n  second invoke -> 'cached answer'   (model calls: 1)\n  the second call hit the cache: True\n\n  a trailing space is a different key -> model calls: 1\n\n  exact match is exact. 'What is LCEL?' and 'what is LCEL?' are two\n  entries, and so are the same question with different history.\n\n==============================================================================\nPART 2 -- hit rate on realistic traffic\n==============================================================================\n  10 queries, all about the same thing.\n  exact-match hits: 2 (20%)\n\n  semantic-ish, threshold 0.9: 5 hits (50%), 0 of them join\n     no obviously wrong joins\n  semantic-ish, threshold 0.7: 6 hits (60%), 0 of them join\n     no obviously wrong joins\n  semantic-ish, threshold 0.5: 8 hits (80%), 0 of them join\n     no obviously wrong joins\n\n  at these thresholds nothing joined wrongly, so the risk is real and\n  NOT demonstrated by that table. here it is demonstrated:\n\n  query A                            query B                            jaccard\n  reset my password                  reset my username                  0.50\n  cancel my order                    cancel my account                  0.50\n  how do I add a user                how do I add a payment method      0.62\n\n  each pair is a DIFFERENT question with high word overlap. at a\n  threshold of 0.5 the first two join, and the cache serves the answer\n  to one as the answer to the other.\n\n  (jaccard on word sets, not embeddings -- an embedding would score\n   these differently, but the shape of the failure is the same: the\n   similarity signal does not know which differences change the answer.)\n\n==============================================================================\nPART 3 -- the cost of a wrong hit\n==============================================================================\n  a cache miss costs one model call.\n  a wrong cache HIT costs a wrong answer, served fast, with no error,\n  to every user who asks that question until the entry expires.\n\n  so the threshold is not a tuning parameter, it is a risk setting.\n  and the thing to measure is not hit rate -- it is wrong-hit rate,\n  which needs a labelled sample and is why most teams never measure it.\n\n==============================================================================\nPART 4 -- what must never be cached\n==============================================================================\n  anything personalised              a cached answer for user A served to user B\n  anything time-sensitive            balances, stock, status, prices\n  anything with retrieved context    the index may have changed (7.5)\n  anything non-deterministic by design a creative task should vary",
        notes: [
          { t: "p", text: "**Exact match is exactly exact**: a trailing space is a different key, and so is a different system prompt, different retrieved context or one more turn of history. In a conversational application exact-match caching almost never hits, because the history makes every prompt unique." },
          { t: "p", text: "**20% hit rate on ten queries that all ask the same thing.** Loosening the threshold took it to 50%, 60% and 80% \u2014 monotonically, which is the attractive half and the reason hit rate is a misleading dashboard." },
          { t: "p", text: "**At those thresholds nothing joined wrongly in that set**, so I constructed pairs where it does: reset my password against reset my username, cancel my order against cancel my account, both at 0.50. At a threshold of 0.5 the cache serves one answer for both." },
          { t: "p", text: "**The asymmetry is the whole argument.** A miss costs one model call and the user gets a correct answer. A wrong hit costs a wrong answer, served fast, with no error, to everyone who asks that question until the entry expires. Cancelling an order and cancelling an account are not the same request." },
          { t: "p", text: "**So measure wrong-hit rate, not hit rate** \u2014 which needs a labelled sample and a judgement about which differences change the answer. That is real work, which is why the free-to-compute metric that points the wrong way is the one most teams track." },
          { t: "p", text: "**The retrieved-context exclusion is the subtle one.** A RAG answer looks cacheable and is correct only until the index changes, with nothing to notice afterwards. The key has to include an index version, which makes a reindex invalidate everything \u2014 blunt and usually right." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the cache that answered the wrong question", body: [
      { t: "p", text: "A support assistant adds semantic caching and the hit rate reaches 40%, which is reported as a success. Weeks later, a pattern emerges in complaints: users asking to cancel a subscription are given instructions for cancelling an order, and vice versa." },
      { t: "p", text: "The similarity threshold was tuned to maximise hit rate, and the two questions share almost every word. There is no error, no exception and no signal \u2014 the cache did exactly what it was configured to do, quickly." },
      { t: "p", text: "Two changes. Tighten the threshold, accepting a lower hit rate, because the correct target is wrong-hit rate near zero rather than hit rate high. And build the labelled pair set that makes wrong-hit rate measurable \u2014 which is the work that was skipped when hit rate was adopted as the metric, and the reason the regression ran for weeks." }
    ] }
  ],
  takeaways: [
    "**Exact-match caching is exactly exact**: a trailing space, a different system prompt or one more turn of history is a different key.",
    "**So in conversational applications it almost never hits**, because history makes every prompt unique.",
    "**Measured: 20% hit rate on ten paraphrases of the same question.**",
    "**Looser thresholds buy hits monotonically** \u2014 50%, 60%, 80% \u2014 which is why hit rate is a misleading dashboard.",
    "**They also merge different questions**: reset-my-password against reset-my-username scores 0.50.",
    "**A miss costs one model call. A wrong hit costs a wrong answer, served fast, with no error, to everyone**, until the entry expires.",
    "**So the threshold is a risk setting, not a performance dial.**",
    "**Measure wrong-hit rate, not hit rate** \u2014 it needs a labelled sample, which is why it is rarely done.",
    "**Never cache**: anything personalised, time-sensitive, grounded in retrieved context, or deliberately non-deterministic.",
    "**A RAG answer is correct until the index changes and silently stale afterwards** \u2014 put an index version in the key."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Why does exact-match caching rarely hit in a conversational application?",
      options: ["Conversations use higher temperatures, which bypasses the cache",
        "The key is the full prompt, and accumulated history makes every prompt unique",
        "Caches expire between turns by default",
        "Chat models do not support caching"],
      answer: 1,
      why: "The cache key is the resolved prompt, so anything in it changes the key \u2014 including the conversation history, which grows every turn. Even the identical question asked twice in one session produces two different prompts. That is before considering a trailing space, a changed system prompt, or different retrieved context, each of which is also a miss." },
    { stem: "Hit rate went from 20% to 80% as the similarity threshold loosened. What does that tell you?",
      options: ["The looser threshold is strictly better",
        "Almost nothing \u2014 hit rate rises monotonically with looseness, so it cannot indicate correctness",
        "That 80% is the cache's natural ceiling",
        "That the exact-match cache was misconfigured"],
      answer: 1,
      why: "Any threshold relaxation increases hits by definition, so the metric improves regardless of whether the merges are correct. That makes hit rate attractive as a dashboard and useless as a decision input. The number that matters is wrong-hit rate, which requires a labelled sample and a judgement about which differences change the answer \u2014 real work, which is why it is usually skipped." },
    { stem: "What does a wrong cache hit cost compared with a miss?",
      options: ["Roughly the same \u2014 both are a single request's worth of error",
        "A wrong answer served fast with no error, to everyone asking that question until the entry expires",
        "Slightly more latency, since the similarity check runs first",
        "Nothing, if the entries have a short TTL"],
      answer: 1,
      why: "A miss costs one model call and the user still gets a correct answer. A wrong hit produces an incorrect response, quickly, with nothing raised, and repeats for every subsequent matching query until expiry \u2014 so one bad entry scales across users. That asymmetry is why the threshold is a risk setting rather than a performance dial." },
    { stem: "Why is a RAG answer a dangerous thing to cache?",
      options: ["Retrieved context makes prompts too long to key on",
        "It was grounded in documents that can change, so the cached answer is silently stale after a reindex",
        "Retrievers are non-deterministic, so the answer varies anyway",
        "Embedding costs make caching uneconomical"],
      answer: 1,
      why: "The question and the answer both look stable, which is what makes it tempting \u2014 but the answer's correctness depends on the index, and nothing notices when that changes. The cache key has to include something that moves when the index does, typically an index version, which makes a reindex invalidate everything. Blunt, correct, and usually the right trade." }
  ] },
  interview: { title: "Interview practice", sub: "Caching", questions: [
    { level: "core", q: "Would you add semantic caching to an LLM application?",
      strong: "A strong answer leads with the asymmetry, not the hit rate.",
      answer: [
        { t: "p", text: "Carefully, and with a different metric than the one people usually reach for." },
        { t: "p", text: "The case for it is real. Exact-match caching almost never hits in a conversational application, because the key is the full prompt and accumulated history makes every prompt unique. I measured 20 per cent on ten paraphrases of one question, and loosening the match took that to 80." },
        { t: "p", text: "But hit rate rises monotonically with looseness, so it improves whether or not the merges are correct \u2014 which makes it an attractive dashboard and a useless decision input. And the failure it hides is asymmetric: a miss costs one model call and the user still gets a correct answer, while a wrong hit costs a wrong answer served fast, with no error, to everyone asking that question until the entry expires." },
        { t: "p", text: "I built the adversarial pairs to check: reset my password against reset my username scores 0.5 on word overlap, as does cancel my order against cancel my account. Those are genuinely different requests. So I would treat the threshold as a risk setting, target wrong-hit rate near zero rather than hit rate high, and accept a lower hit rate as the price." }
      ] },
    { level: "advanced", q: "A semantic cache is serving order-cancellation answers to account-cancellation questions. What happened?",
      strong: "A strong answer identifies the metric as the root cause.",
      answer: [
        { t: "p", text: "The threshold was tuned to maximise hit rate, and those two questions share almost every word. There is no exception, no error and no signal \u2014 the cache did exactly what it was configured to do, and quickly." },
        { t: "p", text: "The root cause is the metric rather than the threshold. Hit rate always improves as the threshold loosens, so optimising it drives you toward exactly this failure, and nothing in the system pushes back because the failure is silent." },
        { t: "p", text: "The immediate fix is tightening the threshold and accepting fewer hits. The real fix is building the labelled pair set that makes wrong-hit rate measurable \u2014 pairs of queries with a judgement about whether they should share an answer. That is the work that was skipped when hit rate was adopted, and it is why the regression ran for weeks before anyone connected the complaints." },
        { t: "p", text: "I would also look at what else is in that cache, because the same reasoning applies to the exclusions. Anything personalised, anything time-sensitive, and anything grounded in retrieved documents are all candidates for the same class of silent staleness." }
      ] },
    { level: "core", q: "What should never be cached?",
      strong: "A strong answer gives four categories and explains the subtle one.",
      answer: [
        { t: "p", text: "Four categories. Anything personalised, because a cached answer for one user gets served to another. Anything time-sensitive \u2014 balances, stock levels, order status, prices. Anything deliberately non-deterministic, where a creative task is supposed to vary. And anything grounded in retrieved context." },
        { t: "p", text: "The last one is the subtle one, because a RAG answer looks like an ideal caching candidate: a stable question with a stable answer. But the answer's correctness depends on the documents it was grounded in, and nothing notices when the index changes." },
        { t: "p", text: "So a cached RAG response is correct right up until a reindex and silently stale afterwards, with no mechanism to detect it. If you cache them, the key has to include something that moves when the index does \u2014 an index version is the simple version, which makes a reindex invalidate everything." },
        { t: "p", text: "That is blunt and usually right. The alternative is per-document invalidation, which is more precise and requires tracking which documents contributed to which cached answer, and in my experience that bookkeeping is not worth it unless reindexing is both frequent and partial." }
      ] }
  ] }
});
